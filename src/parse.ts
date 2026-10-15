import type { AST } from "@eslint-community/regexpp";
import * as t from "./types";
import * as e from "./errors";
import { RGXClassToken, RGXClassUnionToken, RGXGroupToken, RGXLookaheadToken, RGXLookbehindToken, RGXRepeatToken, RGXSubpatternToken, toRGXClassToken } from "./class";
import { RGXTokenCollection } from "./collection";
import { extractCustomRegexFlags } from "./ExtRegExp";
import { assertValidVanillaRegexFlags } from "./typeGuards";
import { createRegex } from "./utils/createRegex";
import { rgxInterpolation } from "./resolve";
import { parseRegexSource, scanOptionsFromFlags } from "./internal";

// The localizable flags in effect at some position, as a set of "i", "m", and "s".
type LocalizableFlags = ReadonlySet<string>;

type ParseContext = {
    // "u" or "v", whichever the pattern was parsed with, so leaves are compiled the same way.
    unicodeFlag: string;
};

function flagsString(flags: LocalizableFlags): string {
    return "ims".split("").filter(flag => flags.has(flag)).join("");
}

// ASCII characters that aren't letters are the only ones the i flag can't affect.
const caseless = /^[\x00-\x40\x5b-\x60\x7b-\x7f]$/;

// The localizable flags that can change what a leaf matches. Erring toward including a flag is harmless, since a
// leaf only ever carries flags that are in effect where it was.
function relevantFlags(node: AST.Node): string {
    switch (node.type) {
        case "Character":
            return caseless.test(String.fromCodePoint(node.value)) ? "" : "i";
        case "CharacterClass":
        case "ExpressionCharacterClass":
            return "i";
        case "CharacterSet":
            if (node.kind === "any") return "s";
            if (node.kind === "digit" || node.kind === "space") return "";
            return "i";
        case "Assertion":
            // Lookarounds are converted to tokens rather than leaves.
            return node.kind === "word" ? "i" : "m";
        /* istanbul ignore next */
        default:
            return "ims";
    }
}

// A leaf is a part of the pattern that has no matching class token, kept as a literal token. It carries the flags in
// effect where it was that can change what it matches, so it matches the same wherever it ends up.
function leaf(raw: string, relevant: string, flags: LocalizableFlags, context: ParseContext): RegExp {
    const leafFlags = relevant.split("").filter(flag => flags.has(flag)).join("");
    return createRegex(raw, context.unicodeFlag + leafFlags);
}

// Strings are escaped with escapeRegex when resolved, which escapes "-". That is only valid outside of a character
// class without the u or v flag.
function canBeString(characters: AST.Character[], flags: LocalizableFlags, context: ParseContext): boolean {
    return characters.every(character => {
        if (flags.has("i") && relevantFlags(character) !== "") return false;
        return context.unicodeFlag === "" || character.value !== 0x2d;
    });
}

// Escapes a character by its value, so it reads the same wherever it is placed. Its raw text might not: without the u
// or v flag, "\1" is an octal escape in a pattern without groups, and a backreference in one with them.
function escapeCharacter(value: number, context: ParseContext): string {
    const character = String.fromCodePoint(value);
    if (/^\w$/.test(character)) return character;
    if (context.unicodeFlag !== "") return `\\u{${value.toString(16)}}`;
    // Without the u or v flag, characters are UTF-16 code units, so the value always fits.
    return `\\u${value.toString(16).padStart(4, "0")}`;
}

function convertCharacters(characters: AST.Character[], flags: LocalizableFlags, context: ParseContext): t.RGXToken {
    if (canBeString(characters, flags, context)) return characters.map(character => String.fromCodePoint(character.value)).join("");
    return leaf(characters.map(character => escapeCharacter(character.value, context)).join(""), "i", flags, context);
}

// A sequence of tokens as one token: nothing for an empty sequence, the token itself for one, or a concatenation.
function sequenceToken(tokens: t.RGXToken[]): t.RGXToken {
    if (tokens.length === 0) return null;
    if (tokens.length === 1) return tokens[0];
    return new RGXTokenCollection(tokens, "concat");
}

function convertAlternative(alternative: AST.Alternative, flags: LocalizableFlags, context: ParseContext): t.RGXToken[] {
    const tokens: t.RGXToken[] = [];
    let characters: AST.Character[] = [];

    const flushCharacters = () => {
        if (characters.length > 0) tokens.push(convertCharacters(characters, flags, context));
        characters = [];
    };

    for (const element of alternative.elements) {
        // Runs of characters become one string (or literal), rather than one token per character.
        if (element.type === "Character") {
            characters.push(element);
            continue;
        }

        flushCharacters();
        tokens.push(convertElement(element, flags, context));
    }

    flushCharacters();
    return tokens;
}

// The contents of a group or pattern, as the tokens to concatenate. Several alternatives become a single union.
function convertAlternatives(alternatives: AST.Alternative[], flags: LocalizableFlags, context: ParseContext): t.RGXToken[] {
    if (alternatives.length === 1) return convertAlternative(alternatives[0]!, flags, context);
    return [new RGXClassUnionToken(alternatives.map(alternative => sequenceToken(convertAlternative(alternative, flags, context))))];
}

function convertGroup(group: AST.Group, flags: LocalizableFlags, context: ParseContext): t.RGXToken {
    if (group.modifiers === null) return sequenceToken(convertAlternatives(group.alternatives, flags, context));

    const groupFlags = new Set(flags);
    for (const flag of group.modifiers.add.raw) groupFlags.add(flag);
    for (const flag of group.modifiers.remove?.raw ?? "") groupFlags.delete(flag);
    const contents = convertAlternatives(group.alternatives, groupFlags, context);

    // A group's flags are the flags in effect inside it, and an empty value means the group sets none. So a group
    // that turns off every localizable flag can't be an RGXGroupToken. Its delimiters are kept as interpolations instead,
    // so its contents are still tokens.
    if (groupFlags.size === 0) {
        // When no flags were in effect around it either, the group changes nothing.
        if (flags.size === 0) return sequenceToken(contents);
        return new RGXTokenCollection([rgxInterpolation(`(?-${flagsString(flags)}:`), ...contents, rgxInterpolation(")")], "concat");
    }

    return new RGXGroupToken({ capturing: false, flags: flagsString(groupFlags) }, contents);
}

function convertQuantifier(quantifier: AST.Quantifier, flags: LocalizableFlags, context: ParseContext): t.RGXToken {
    const element = quantifier.element.type === "Character"
        ? convertCharacters([quantifier.element], flags, context)
        : convertElement(quantifier.element, flags, context);

    try {
        return new RGXRepeatToken(element, quantifier.min, quantifier.max === Infinity ? null : quantifier.max, !quantifier.greedy);
    } catch (err) {
        // Assertions can be quantified (lookaheads without the u or v flag, and groups that only contain assertions),
        // but RGXRepeatToken refuses tokens that consume no characters. The quantifier is kept as an interpolation
        // after the element instead, with a group around the element so the quantifier is valid with any flags.
        if (err instanceof e.RGXNotSupportedError) {
            const suffix = quantifier.raw.slice(quantifier.element.end - quantifier.start);
            return new RGXTokenCollection([rgxInterpolation("(?:"), element, rgxInterpolation(")" + suffix)], "concat");
        }

        // This is ignored because I don't know what kind of
        // unexpected errors might happen.
        /* istanbul ignore next */
        throw err;
    }
}

function convertElement(element: Exclude<AST.Element, AST.Character>, flags: LocalizableFlags, context: ParseContext): t.RGXToken {
    switch (element.type) {
        case "Group":
            return convertGroup(element, flags, context);
        case "CapturingGroup":
            return new RGXGroupToken({ name: element.name, capturing: true }, convertAlternatives(element.alternatives, flags, context));
        case "Quantifier":
            return convertQuantifier(element, flags, context);
        case "Backreference":
            return new RGXSubpatternToken(element.ref);
        case "Assertion":
            if (element.kind === "lookahead" || element.kind === "lookbehind") {
                const Lookaround = element.kind === "lookahead" ? RGXLookaheadToken : RGXLookbehindToken;
                return new Lookaround(convertAlternatives(element.alternatives, flags, context), !element.negate);
            }

            return leaf(element.raw, relevantFlags(element), flags, context);
        default:
            return leaf(element.raw, relevantFlags(element), flags, context);
    }
}

// Converts a regex into the equivalent tree of tokens, so that a pattern written as a regex can be manipulated with the
// class token API. Groups, quantifiers, alternatives, lookarounds, and backreferences become RGXGroupToken,
// RGXRepeatToken, RGXClassUnionToken, RGXLookaheadToken/RGXLookbehindToken, and RGXSubpatternToken instances, runs of
// characters become strings, and everything else (such as character classes, escapes like "\d", "." and anchors)
// becomes a literal token.
export function rgxParse(pattern: RegExp | string, flags?: string): RGXClassToken {
    const source = typeof pattern === "string" ? pattern : pattern.source;
    flags ??= typeof pattern === "string" ? "" : pattern.flags;

    if (extractCustomRegexFlags(flags) !== "") {
        throw new e.RGXNotSupportedError(
            "Parsing regexes with custom flags",
            "Custom flag transformers change the source before it is compiled, and the change can't be undone."
        );
    }

    assertValidVanillaRegexFlags(flags);
    // Throws RGXInvalidRegexStringError if the source isn't a valid regex.
    createRegex(source, flags);

    const ast = parseRegexSource(source, scanOptionsFromFlags(flags));
    // The engine may accept syntax that is newer than the parser. There is none at the moment, so this can't be tested.
    /* istanbul ignore if */
    if (ast === null) throw new e.RGXNotSupportedError("Parsing this regex", "It uses syntax that isn't recognized yet.");

    const context: ParseContext = { unicodeFlag: flags.includes("v") ? "v" : flags.includes("u") ? "u" : "" };
    const globalFlags: LocalizableFlags = new Set(flags.replaceAll(/[^ims]/g, ""));
    const tokens = convertAlternatives(ast.alternatives, globalFlags, context);

    // A pattern with localizable flags is wrapped in a group that sets them, so the result matches the same wherever
    // it is placed, even in a pattern with different flags.
    if (globalFlags.size > 0) return new RGXGroupToken({ capturing: false, flags: flagsString(globalFlags) }, tokens);
    return toRGXClassToken(sequenceToken(tokens));
}
