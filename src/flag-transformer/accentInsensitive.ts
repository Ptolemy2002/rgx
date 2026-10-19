import { AST, visitRegExpAST } from "@eslint-community/regexpp";
import { RegExpFlagTransformer } from "src/ExtRegExp";
import { accentableCodePoints, accentBaseOf, accentVariantClass, parseRegexSource, scanOptionsFromFlags } from "src/internal";

type CharacterClassNode = AST.CharacterClass | AST.ExpressionCharacterClass;

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
// nothing is left). Without the v flag, only characters and ranges count, since character sets like \w can't have
// characters removed from them.
function splitCharacterClass(node: CharacterClassNode, unicodeSets: boolean): { accentable: number[]; rest: string | null } {
    const elements = node.type === "CharacterClass" ? node.elements : null;
    const needsSetOperations = elements === null || elements.some(element => element.type === "CharacterClass" || element.type === "ClassStringDisjunction");

    if (unicodeSets && needsSetOperations) {
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
            rest.push(element.raw);
        }
    }

    return { accentable, rest: rest.length === 0 ? null : `[${rest.join("")}]` };
}

export const accentInsensitiveFlagTransformer: RegExpFlagTransformer = function (exp) {
    const source = exp.source;
    const flags = exp.flags;
    const unicode = flags.includes("u") || flags.includes("v");
    const unicodeSets = flags.includes("v");

    const ast = parseRegexSource(source, scanOptionsFromFlags(flags));
    // Flag transformers are only given valid regexes, so this only happens if the engine accepts syntax that is newer
    // than the parser. There is none at the moment, so this can't be tested.
    /* istanbul ignore if */
    if (ast === null) return [source, flags];

    // Any number of combining marks after a letter, so decomposed text matches too.
    const marks = unicode ? "\\p{M}*" : "[\\u0300-\\u036f]*";
    const replacementFor = (letter: string) => accentVariantClass(letter) + marks;

    const replacements: { start: number; end: number; replacement: string }[] = [];
    // The elements that were replaced, so combining marks written after them can be removed.
    const replaced = new Set<AST.Node>();

    // Only what is matched directly is replaced, not characters inside classes (which are handled with their class),
    // or that are part of other syntax.
    const isElement = (node: AST.Character | CharacterClassNode) => node.parent.type === "Alternative" || node.parent.type === "Quantifier";

    // grouped means the replacement is already a single group.
    function replace(node: AST.Character | CharacterClassNode, replacement: string, grouped = false) {
        // A quantifier applies to the whole replacement.
        if (node.parent.type === "Quantifier" && !grouped) replacement = `(?:${replacement})`;
        replacements.push({ start: node.start, end: node.end, replacement });
        replaced.add(node);
    }

    function replaceCharacterClass(node: CharacterClassNode) {
        if (!isElement(node)) return;

        const { accentable, rest } = splitCharacterClass(node, unicodeSets);
        if (accentable.length === 0) return;

        // One alternative per letter, in the order the class contains them.
        const letters = [...new Set(accentable.map(codePoint => accentBaseOf(codePoint)!))];
        const alternatives = letters.map(replacementFor);

        // A negated class can't be split into alternatives, so it becomes a negative lookahead for the letters, then
        // the class itself, whose other characters are left as they are.
        if (node.negate) replace(node, `(?!${alternatives.join("|")})${node.raw}`);
        else replace(node, `(?:${[...(rest === null ? [] : [rest]), ...alternatives].join("|")})`, true);
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
