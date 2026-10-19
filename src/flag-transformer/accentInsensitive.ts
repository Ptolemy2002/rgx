import { AST, visitRegExpAST } from "@eslint-community/regexpp";
import { RegExpFlagTransformer } from "src/ExtRegExp";
import { accentableCodePoints, accentBaseOf, accentVariantClass, parseRegexSource, scanOptionsFromFlags } from "src/internal";

type CharacterClassNode = AST.CharacterClass | AST.ExpressionCharacterClass;
type ReplaceableNode = AST.Character | AST.CharacterSet | CharacterClassNode;

let setExpansion = true;

// Whether character sets such as \w and \p{L} are expanded to cover the accented forms of the letters they match.
// Expanding them makes patterns much longer, so it can be turned off. Only patterns transformed afterwards are affected,
// but an ExtRegExp can be rebuilt from its original source to pick up the change.
export function setAccentInsensitiveSetExpansion(value: boolean) {
    setExpansion = value;
}

export function getAccentInsensitiveSetExpansion(): boolean {
    return setExpansion;
}

// The accentable characters a character set matches, found by testing each one. Cached, since it means testing every
// accentable character, and the same sets (like \w) come up often.
const setContentsCache = new Map<string, number[]>();
function accentableInSet(raw: string, unicodeFlag: string): number[] {
    const key = `${unicodeFlag}:${raw}`;
    let result = setContentsCache.get(key);
    if (result === undefined) {
        const test = new RegExp(`^${raw}$`, unicodeFlag);
        result = accentableCodePoints().filter(codePoint => test.test(String.fromCodePoint(codePoint)));
        setContentsCache.set(key, result);
    }
    return result;
}

// A character class for the lowercase letter and its precomposed variants that, case-insensitively, matches every
// variant of both cases. Case folding misses a few uppercase variants (such as U+0130, and U+212B without the u flag),
// so those are added. Cached, since it means testing each uppercase variant.
const caselessClassCache = new Map<string, string>();
function caselessVariantClass(lower: string, unicodeFlag: string): string {
    const key = `${unicodeFlag}:${lower}`;
    let result = caselessClassCache.get(key);
    if (result === undefined) {
        const lowerClass = accentVariantClass(lower);
        const test = new RegExp(`^(?i:${lowerClass})$`, unicodeFlag);
        const missed = accentVariantClass(lower.toUpperCase()).slice(1, -1);
        const extra = [...missed].filter(character => !test.test(character)).join("");
        result = `${lowerClass.slice(0, -1)}${extra}]`;
        caselessClassCache.set(key, result);
    }
    return result;
}

// The set without its negation (\W becomes \w, \P{L} becomes \p{L}).
function positiveSetRaw(node: AST.EscapeCharacterSet | AST.UnicodePropertyCharacterSet) {
    return node.negate ? `\\${node.raw[1]!.toLowerCase()}${node.raw.slice(2)}` : node.raw;
}

// Combining marks written after an accentable character in the pattern are covered by its replacement.
function isCombiningMark(codePoint: number) {
    return /^\p{M}$/u.test(String.fromCodePoint(codePoint));
}

// Writes a code point so it reads as itself inside a character class with any flags.
function classCharacter(codePoint: number) {
    const character = String.fromCodePoint(codePoint);
    if (/^[A-Za-z0-9]$/.test(character)) return character;
    if (codePoint <= 0xFFFF) return `\\u${codePoint.toString(16).padStart(4, "0")}`;
    return `\\u{${codePoint.toString(16)}}`;
}

function classRange(min: number, max: number) {
    return min === max ? classCharacter(min) : `${classCharacter(min)}-${classCharacter(max)}`;
}

// The accentable characters the class contains, and the class without them (as the source of a class, or null when
// nothing is left). Without the v flag, character sets like \w can't have characters removed from them, so they are
// kept whole, and only count when set expansion is on.
function splitCharacterClass(node: CharacterClassNode, unicodeFlag: string): { accentable: number[]; rest: string | null } {
    const elements = node.type === "CharacterClass" ? node.elements : null;
    const needsSetOperations = elements === null || elements.some(element => element.type === "CharacterClass" || element.type === "ClassStringDisjunction");

    if (unicodeFlag === "v" && needsSetOperations) {
        // Set operations and nested classes are applied by testing each accentable character against the class.
        const positive = node.negate ? `[${node.raw.slice(2)}` : node.raw;
        const test = new RegExp(`^${positive}$`, "v");
        const accentable = accentableCodePoints().filter(codePoint => test.test(String.fromCodePoint(codePoint)));
        return { accentable, rest: `[${positive}--[${accentable.map(classCharacter).join("")}]]` };
    }

    const accentable: number[] = [];
    const rest: string[] = [];
    for (const element of elements!) {
        if (element.type === "Character") {
            if (accentBaseOf(element.value) !== null) accentable.push(element.value);
            else rest.push(element.raw);
        } else if (element.type === "CharacterClassRange") {
            const { min, max } = element;
            const inside = accentableCodePoints().filter(codePoint => codePoint >= min.value && codePoint <= max.value);
            if (inside.length === 0) {
                rest.push(element.raw);
                continue;
            }

            // The range is split around the accentable characters it contains.
            let start = min.value;
            for (const codePoint of inside) {
                if (codePoint > start) rest.push(classRange(start, codePoint - 1));
                start = codePoint + 1;
            }
            if (start <= max.value) rest.push(classRange(start, max.value));
            accentable.push(...inside);
        } else {
            // Negated sets (such as \W) are kept as they are, since their accented forms can't be ruled out from
            // inside a class.
            if (setExpansion && element.type === "CharacterSet" && !element.negate) accentable.push(...accentableInSet(element.raw, unicodeFlag));
            rest.push(element.raw);
        }
    }

    return { accentable, rest: rest.length === 0 ? null : `[${rest.join("")}]` };
}

export const accentInsensitiveFlagTransformer: RegExpFlagTransformer = function (exp) {
    const source = exp.source;
    const flags = exp.flags;
    const unicode = flags.includes("u") || flags.includes("v");
    const unicodeFlag = flags.includes("v") ? "v" : unicode ? "u" : "";

    const ast = parseRegexSource(source, scanOptionsFromFlags(flags));
    // Flag transformers are only given valid regexes, so this only happens if the engine accepts syntax that is newer
    // than the parser. There is none at the moment, so this can't be tested.
    /* istanbul ignore if */
    if (ast === null) return [source, flags];

    // Any number of combining marks after a letter, so decomposed text matches too.
    const marks = unicode ? "\\p{M}*" : "[\\u0300-\\u036f]*";
    const replacementFor = (letter: string) => accentVariantClass(letter) + marks;
    // Both cases of a letter as one case-insensitive replacement. Each class gets its own group, since V8 only makes
    // the first class in an alternation inside a modifier group case-insensitive without the u flag. With the v flag
    // (and without i), V8 also makes classes after a modifier group case-insensitive, even outside it, so both cases
    // are kept apart there.
    const mergeCases = unicodeFlag !== "v" || flags.includes("i");
    const caselessReplacementFor = (letter: string) => {
        const lower = caselessVariantClass(letter.toLowerCase(), unicodeFlag);
        return (flags.includes("i") ? lower : `(?i:${lower})`) + marks;
    };

    const replacements: { start: number; end: number; replacement: string }[] = [];
    // The elements that were replaced, so combining marks written after them can be removed.
    const replaced = new Set<AST.Node>();

    // Only what is matched directly is replaced, not characters inside classes (which are handled with their class),
    // or that are part of other syntax.
    const isElement = (node: ReplaceableNode) => node.parent.type === "Alternative" || node.parent.type === "Quantifier";

    // grouped means the replacement is already a single group.
    function replace(node: ReplaceableNode, replacement: string, grouped = false) {
        // A quantifier applies to the whole replacement.
        if (node.parent.type === "Quantifier" && !grouped) replacement = `(?:${replacement})`;
        replacements.push({ start: node.start, end: node.end, replacement });
        replaced.add(node);
    }

    // Replaces something matching one character with alternatives for the letters it contains, followed by what is
    // left of it. The letters come first, so they are matched together with their marks. Something negated can't be
    // split into alternatives, so it becomes a negative lookahead for the letters, followed by itself, whose other
    // characters are left as they are.
    function replaceMatcher(node: ReplaceableNode, accentable: number[], rest: string | null, negate: boolean) {
        if (accentable.length === 0) return;

        // One alternative per letter, in the order they are contained. Letters contained in both cases (as with \w)
        // share one case-insensitive alternative, which is about half as long.
        const letters = new Set(accentable.map(codePoint => accentBaseOf(codePoint)!));
        const alternatives: string[] = [];
        const done = new Set<string>();
        for (const letter of letters) {
            const lower = letter.toLowerCase();
            const upper = letter.toUpperCase();
            if (mergeCases && letters.has(lower) && letters.has(upper)) {
                if (done.has(lower)) continue;
                done.add(lower);
                alternatives.push(caselessReplacementFor(letter));
            } else {
                alternatives.push(replacementFor(letter));
            }
        }

        if (negate) replace(node, `(?!${alternatives.join("|")})${node.raw}`);
        else replace(node, `(?:${[...alternatives, ...(rest === null ? [] : [rest])].join("|")})`, true);
    }

    function replaceCharacterClass(node: CharacterClassNode) {
        if (!isElement(node)) return;
        const { accentable, rest } = splitCharacterClass(node, unicodeFlag);
        replaceMatcher(node, accentable, rest, node.negate);
    }

    visitRegExpAST(ast, {
        onCharacterEnter(node) {
            if (!isElement(node)) return;

            const letter = accentBaseOf(node.value);
            if (letter !== null) {
                replace(node, replacementFor(letter));
                return;
            }

            if (node.parent.type === "Alternative" && isCombiningMark(node.value)) {
                const elements = node.parent.elements;
                const previous = elements[elements.indexOf(node) - 1];
                if (previous !== undefined && replaced.has(previous)) replace(node, "");
            }
        },
        onCharacterSetEnter(node) {
            // . already matches every letter, accented or not.
            if (!setExpansion || node.kind === "any" || !isElement(node)) return;
            // A negated set is treated like a negated class of its positive form, so \W rules out every form of the
            // letters \w matches.
            replaceMatcher(node, accentableInSet(positiveSetRaw(node), unicodeFlag), node.raw, node.negate);
        },
        onCharacterClassEnter: replaceCharacterClass,
        onExpressionCharacterClassEnter: replaceCharacterClass
    });

    // Replacing from the end keeps the positions of the earlier elements valid.
    let result = source;
    for (const { start, end, replacement } of replacements.sort((a, b) => b.start - a.start)) {
        result = result.slice(0, start) + replacement + result.slice(end);
    }

    return [result, flags];
};
