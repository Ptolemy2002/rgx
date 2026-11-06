import { ScanRegexSourceOptions } from "./scanRegexSource";

// JavaScript has no atomic groups, so they are emulated with a lookahead that captures what it matched, followed by a
// backreference to that capture: (?=(?<name>x))\k<name>. The lookahead can't be backtracked into once it succeeds, so
// the backreference consumes exactly what x first matched.
//
// Every atomic group resolves to the same text, with the placeholder name below, so resolving a token never depends on
// what else is in the pattern. Each definition always comes paired with its backreference, and pairs nest like
// parentheses, so they can be found without parsing and given unique names wherever a source has to be valid: when it
// is compiled, and before it is parsed. The suffix has a fixed width, so renaming never changes the length of a
// source, and positions found in the renamed source are valid in the original.
export const rgxAtomicGroupPrefix = "rgx_atomic_";
const suffixWidth = 6;
const suffixRadix = 36;
const maxPairs = suffixRadix ** suffixWidth;
const placeholderName = `${rgxAtomicGroupPrefix}${"0".repeat(suffixWidth)}`;

const definitionStart = `(?=(?<${rgxAtomicGroupPrefix}`;
const referenceStart = `\\k<${rgxAtomicGroupPrefix}`;
const suffixPattern = new RegExp(`^[0-9a-z]{${suffixWidth}}>`);

// The source of an atomic group around the given source.
export function atomicRegexSource(source: string): string {
    return `(?=(?<${placeholderName}>${source}))\\k<${placeholderName}>`;
}

export type RGXAtomicPair = {
    // The position of the "(" that opens the capture group (not the lookahead around it).
    groupStart: number;
    // The positions of the names of the group and its backreference.
    definitionName: number;
    referenceName: number;
};

function hasSuffix(source: string, nameStart: number): boolean {
    return suffixPattern.test(source.slice(nameStart + rgxAtomicGroupPrefix.length, nameStart + rgxAtomicGroupPrefix.length + suffixWidth + 1));
}

// The atomic groups in a source, ordered by where they start. Escapes and character classes are skipped, the same way
// scanRegexSource skips them, and definitions or backreferences without a partner are left out.
export function findRGXAtomicPairs(source: string, { unicodeSets = false }: ScanRegexSourceOptions = {}): RGXAtomicPair[] {
    if (!source.includes(rgxAtomicGroupPrefix)) return [];

    const pairs: RGXAtomicPair[] = [];
    const open: { groupStart: number, definitionName: number }[] = [];
    let charClassDepth = 0;

    for (let i = 0; i < source.length; i++) {
        const ch = source[i];

        if (ch === '\\') {
            if (charClassDepth === 0 && source.startsWith(referenceStart, i) && hasSuffix(source, i + 3)) {
                const definition = open.pop();
                if (definition) pairs.push({ ...definition, referenceName: i + 3 });
            }
            i++;
        }
        else if (charClassDepth > 0) {
            if (ch === '[' && unicodeSets) charClassDepth++;
            else if (ch === ']') charClassDepth--;
        }
        else if (ch === '[') charClassDepth++;
        else if (ch === '(' && source.startsWith(definitionStart, i) && hasSuffix(source, i + definitionStart.length - rgxAtomicGroupPrefix.length)) {
            open.push({ groupStart: i + 3, definitionName: i + definitionStart.length - rgxAtomicGroupPrefix.length });
        }
    }

    return pairs.sort((a, b) => a.groupStart - b.groupStart);
}

// The source with each atomic group named by its position among them, so no name repeats. The result has the same
// length as the source.
export function renumberRGXAtomicGroups(source: string, options: ScanRegexSourceOptions = {}): string {
    const pairs = findRGXAtomicPairs(source, options);
    if (pairs.length === 0) return source;

    /* istanbul ignore if */
    if (pairs.length > maxPairs) throw new RangeError(`A pattern can have at most ${maxPairs} atomic groups.`);

    let result = source;
    pairs.forEach((pair, index) => {
        const name = `${rgxAtomicGroupPrefix}${index.toString(suffixRadix).padStart(suffixWidth, "0")}`;
        for (const nameStart of [pair.definitionName, pair.referenceName]) {
            result = result.slice(0, nameStart) + name + result.slice(nameStart + name.length);
        }
    });
    return result;
}

// Whether a group name is one the library gives atomic groups.
export function isRGXAtomicGroupName(name: string | null | undefined): boolean {
    return name?.startsWith(rgxAtomicGroupPrefix) ?? false;
}
