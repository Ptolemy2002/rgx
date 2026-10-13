export type ScanRegexSourceOptions = {
    // Whether the source will be compiled with the u or v flag, which changes how some escapes are read.
    unicode?: boolean;
    // Whether the source will be compiled with the v flag, which lets character classes nest.
    unicodeSets?: boolean;
};

export type RegexSourceScan = {
    // How many groups are still open at the end of the source.
    depth: number;
    // Whether a ')' appeared with no open group to close.
    unmatchedClose: boolean;
    // How many units appear outside of any group. A group, character class, escape, and any other single
    // character each count as one unit, so quantifiers and alternation bars count as units of their own.
    topLevelUnits: number;
};

// Escapes that span more than two characters. Their bodies never contain parentheses, brackets, or backslashes,
// so consuming them whole doesn't change how groups and classes are counted. If the body doesn't match, the
// escape falls back to two characters, which can only make a source look like more units than it is.
const multiCharEscapes = [/\\u[0-9a-fA-F]{4}/y, /\\x[0-9a-fA-F]{2}/y, /\\c[a-zA-Z]/y];
const unicodeMultiCharEscapes = [/\\u\{[0-9a-fA-F]+\}/y, /\\[pP]\{[a-zA-Z0-9_=]+\}/y, /\\k<[^<>()[\]\\]+>/y, ...multiCharEscapes];

function escapeLength(source: string, index: number, unicode: boolean): number {
    for (const escape of unicode ? unicodeMultiCharEscapes : multiCharEscapes) {
        escape.lastIndex = index;
        if (escape.test(source)) return escape.lastIndex - index;
    }

    return 2;
}

// A lightweight scan of a regex source that tracks group and character class structure without fully
// parsing it. It works on sources that are not valid regexes (such as interpolations with unterminated groups).
export function scanRegexSource(source: string, { unicode = false, unicodeSets = false }: ScanRegexSourceOptions = {}): RegexSourceScan {
    unicode ||= unicodeSets;

    let depth = 0;
    let charClassDepth = 0;
    let unmatchedClose = false;
    let topLevelUnits = 0;

    for (let i = 0; i < source.length; i++) {
        const ch = source[i];

        if (charClassDepth > 0) {
            if (ch === '\\') i++;
            // Character classes only nest with the v flag. Without it, '[' inside a class is a literal.
            else if (ch === '[' && unicodeSets) charClassDepth++;
            else if (ch === ']') charClassDepth--;
            continue;
        }

        if (depth === 0 && ch !== ')') topLevelUnits++;

        if (ch === '\\') {
            i += escapeLength(source, i, unicode) - 1;
        } else if (ch === '[') {
            charClassDepth++;
        } else if (ch === '(') {
            depth++;
        } else if (ch === ')') {
            if (depth === 0) {
                unmatchedClose = true;
                topLevelUnits++;
            } else {
                depth--;
            }
        }
    }

    return { depth, unmatchedClose, topLevelUnits };
}

export function hasRegexParenErrors(source: string, options: ScanRegexSourceOptions = {}): boolean {
    const { depth, unmatchedClose } = scanRegexSource(source, options);
    return unmatchedClose || depth !== 0;
}

// Single units that can't take a quantifier directly.
const unquantifiableUnits = new Set(['|', '^', '$', '*', '+', '?', '{', '}', ']', '\\b', '\\B']);
const assertionGroupPrefixes = ['(?=', '(?!', '(?<=', '(?<!'];

// Whether the source is a singleton: exactly one unit that a quantifier can apply to as a whole,
// such as a single character, escape, character class, or (non-assertion) group. This errs toward
// false, since wrapping a singleton in a group again is harmless, but quantifying a non-singleton is not.
export function isSingletonRegexSource(source: string, options: ScanRegexSourceOptions = {}): boolean {
    const { depth, unmatchedClose, topLevelUnits } = scanRegexSource(source, options);
    if (depth !== 0 || unmatchedClose || topLevelUnits !== 1) return false;
    if (unquantifiableUnits.has(source)) return false;
    return !assertionGroupPrefixes.some(prefix => source.startsWith(prefix));
}

// Returns a singleton equivalent to the source, adding a non-capturing group if it isn't one already and removing
// any non-capturing groups that only wrap another singleton, so a quantifier can be appended to the result.
export function toSingletonRegexSource(source: string, options: ScanRegexSourceOptions = {}): string {
    if (!isSingletonRegexSource(source, options)) return `(?:${source})`;

    while (source.startsWith('(?:')) {
        const inner = source.slice(3, -1);
        if (!isSingletonRegexSource(inner, options)) break;
        source = inner;
    }

    return source;
}
