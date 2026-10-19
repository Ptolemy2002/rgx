import type { AST } from "@eslint-community/regexpp";
import * as t from "./types";
import * as e from "./errors";
import { RGXClassToken, RGXClassUnionToken, RGXGroupToken, RGXLookaheadToken, RGXLookbehindToken, RGXRepeatToken, RGXSubpatternToken, toRGXClassToken } from "./class";
import { RGXTokenCollection } from "./collection";
import { extractCustomRegexFlags } from "./ExtRegExp";
import { assertValidVanillaRegexFlags } from "./typeGuards";
import { createRegex } from "./utils/createRegex";
import { rgxInterpolation } from "./resolve";
import { isNonConsumingRegexNode, parseRegexSource, scanOptionsFromFlags } from "./internal";

// The localizable flags in effect at some position, as a set of "i", "m", and "s".
type LocalizableFlags = ReadonlySet<string>;

export type RGXParseOptions = {
    flags?: string;
    mergeAliases?: boolean;
};

type ParseContext = {
    // "u" or "v", whichever the pattern was parsed with, so leaves are compiled the same way.
    unicodeFlag: string;
    mergeAliases: boolean;
};

function flagsString(flags: LocalizableFlags): string {
    return "ims".split("").filter(flag => flags.has(flag)).join("");
}

// ASCII characters that aren't letters are the only ones the i flag can't affect.
const caseless = /^[\x00-\x40\x5b-\x60\x7b-\x7f]$/;

// A leaf is a part of the pattern that has no matching class token, kept as a literal token. It carries the
// localizable flags in effect where it was, so it matches the same wherever it ends up, and placing it where those
// flags are in effect adds nothing to the pattern.
function leaf(raw: string, flags: LocalizableFlags, context: ParseContext): RegExp {
    return createRegex(raw, context.unicodeFlag + flagsString(flags));
}

// Strings inherit the flags of wherever they are placed, so characters the i flag affects can only be strings when it
// is off.
function canBeString(characters: AST.Character[], flags: LocalizableFlags): boolean {
    return !flags.has("i") || characters.every(character => caseless.test(String.fromCodePoint(character.value)));
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
    if (canBeString(characters, flags)) return characters.map(character => String.fromCodePoint(character.value)).join("");
    return leaf(characters.map(character => escapeCharacter(character.value, context)).join(""), flags, context);
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

    // When no flags were in effect around a group that turns them all off, it changes nothing.
    if (groupFlags.size === 0 && flags.size === 0) return sequenceToken(contents);

    return new RGXGroupToken({ capturing: false, flags: flagsString(groupFlags) }, contents);
}

function convertCapturingGroup(group: AST.CapturingGroup, flags: LocalizableFlags, context: ParseContext): RGXGroupToken {
    const contents = convertAlternatives(group.alternatives, flags, context);
    const [inner] = contents;

    // A named group whose only contents are another named group becomes one group, with the inner group's names as
    // aliases. Named groups converted here never set flags, so nothing else sits between the two.
    if (context.mergeAliases && group.name !== null && contents.length === 1 && inner instanceof RGXGroupToken && inner.name !== null) {
        return new RGXGroupToken({ name: group.name, aliases: inner.allNames() }, inner.tokens);
    }

    return new RGXGroupToken({ name: group.name, capturing: true }, contents);
}

function convertQuantifier(quantifier: AST.Quantifier, flags: LocalizableFlags, context: ParseContext): t.RGXToken {
    const element = quantifier.element.type === "Character"
        ? convertCharacters([quantifier.element], flags, context)
        : convertElement(quantifier.element, flags, context);

    // An element made entirely of assertions consumes nothing, so repeating it at the same position can't change the
    // result, and once the minimum is reached, the engine rejects any repetition that consumes nothing. So when at least
    // one repetition is required, the quantifier changes nothing and is dropped. When none is required, the element
    // never takes part in the match, but it is still kept below, since its capture groups still count.
    if (quantifier.min >= 1 && isNonConsumingRegexNode(quantifier.element)) return element;

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
            return convertCapturingGroup(element, flags, context);
        case "Quantifier":
            return convertQuantifier(element, flags, context);
        case "Backreference":
            return new RGXSubpatternToken(element.ref);
        case "Assertion":
            if (element.kind === "lookahead" || element.kind === "lookbehind") {
                const Lookaround = element.kind === "lookahead" ? RGXLookaheadToken : RGXLookbehindToken;
                return new Lookaround(convertAlternatives(element.alternatives, flags, context), !element.negate);
            }

            return leaf(element.raw, flags, context);
        default:
            return leaf(element.raw, flags, context);
    }
}

// Converts a regex into the equivalent tree of tokens, so that a pattern written as a regex can be manipulated with the
// class token API. Groups, quantifiers, alternatives, lookarounds, and backreferences become RGXGroupToken,
// RGXRepeatToken, RGXClassUnionToken, RGXLookaheadToken/RGXLookbehindToken, and RGXSubpatternToken instances, runs of
// characters become strings, and everything else (such as character classes, escapes like "\d", "." and anchors)
// becomes a literal token.
// Unless mergeAliases is false, nested named groups with nothing else between them become one RGXGroupToken with aliases.
// The options can also be passed in place of the flags, with the flags among them.
export function rgxParse(pattern: RegExp | string, flags?: string, options?: Omit<RGXParseOptions, "flags">): RGXClassToken;
export function rgxParse(pattern: RegExp | string, options?: RGXParseOptions): RGXClassToken;
export function rgxParse(pattern: RegExp | string, flagsOrOptions?: string | RGXParseOptions, options: RGXParseOptions = {}): RGXClassToken {
    if (typeof flagsOrOptions === "object") options = flagsOrOptions;
    else options = { ...options, flags: flagsOrOptions };

    const { mergeAliases = true } = options;
    const source = typeof pattern === "string" ? pattern : pattern.source;
    const flags = options.flags ?? (typeof pattern === "string" ? "" : pattern.flags);

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

    const context: ParseContext = { unicodeFlag: flags.includes("v") ? "v" : flags.includes("u") ? "u" : "", mergeAliases };
    const globalFlags: LocalizableFlags = new Set(flags.replaceAll(/[^ims]/g, ""));
    const tokens = convertAlternatives(ast.alternatives, globalFlags, context);

    // A pattern with localizable flags is wrapped in a group that sets them, so the result matches the same wherever
    // it is placed, even in a pattern with different flags.
    if (globalFlags.size > 0) return new RGXGroupToken({ capturing: false, flags: flagsString(globalFlags) }, tokens);
    return toRGXClassToken(sequenceToken(tokens));
}
