export type ScanRegexSourceOptions = {
    // Whether the source will be compiled with the u or v flag, which changes how some escapes are read.
    unicode?: boolean;
    // Whether the source will be compiled with the v flag, which lets character classes nest.
    unicodeSets?: boolean;
};

export function scanOptionsFromFlags(flags: string): ScanRegexSourceOptions {
    return { unicode: flags.includes('u') || flags.includes('v'), unicodeSets: flags.includes('v') };
}

export type RegexSourceScan = {
    // How many groups are still open at the end of the source.
    depth: number;
    // Whether a ')' appeared with no open group to close.
    unmatchedClose: boolean;
    // How many units appear outside of any group. A group, character class, escape, quantifier, alternation bar,
    // and any other single character each count as one unit. Escapes whose meaning depends on context
    // (a "\c" without a control letter, or a multi-digit decimal escape) count as two, since they may be read as
    // more than one unit.
    topLevelUnits: number;
};

export type RegexSourceUnit =
    | { kind: 'char' | 'escape' | 'class' | 'quantifier' | 'alternation', text: string }
    | { kind: 'group', prefix: string, children: RegexSourceUnit[], closed: boolean };

// Escapes that span more than two characters. Their bodies never contain parentheses, brackets, or backslashes,
// so consuming them whole doesn't change how groups and classes are counted. If the body doesn't match, the
// escape falls back to two characters, which can only make a source look like more units than it is.
// Decimal escapes are read greedily, since "\1" followed by "0" is read as "\10".
const multiCharEscapes = [/\\u[0-9a-fA-F]{4}/y, /\\x[0-9a-fA-F]{2}/y, /\\c[a-zA-Z]/y, /\\\d+/y];
const unicodeMultiCharEscapes = [/\\u\{[0-9a-fA-F]+\}/y, /\\[pP]\{[a-zA-Z0-9_=]+\}/y, /\\k<[^<>()[\]\\]+>/y, ...multiCharEscapes];

const groupPrefix = /\((?:\?(?:[:=!]|<[=!]|<[^<>()]*>|[a-zA-Z]*(?:-[a-zA-Z]*)?:))?/y;
const bracedQuantifier = /\{\d+(?:,\d*)?\}\??/y;

function matchLength(pattern: RegExp, source: string, index: number): number {
    pattern.lastIndex = index;
    return pattern.test(source) ? pattern.lastIndex - index : 0;
}

function escapeLength(source: string, index: number, unicode: boolean): number {
    for (const escape of unicode ? unicodeMultiCharEscapes : multiCharEscapes) {
        const length = matchLength(escape, source, index);
        if (length > 0) return length;
    }

    return Math.min(2, source.length - index);
}

function charClassLength(source: string, index: number, unicodeSets: boolean): number {
    let charClassDepth = 0;

    for (let i = index; i < source.length; i++) {
        const ch = source[i];

        if (ch === '\\') i++;
        // Character classes only nest with the v flag. Without it, '[' inside a class is a literal.
        else if (ch === '[' && (charClassDepth === 0 || unicodeSets)) charClassDepth++;
        else if (ch === ']' && --charClassDepth === 0) return i + 1 - index;
    }

    // Unterminated character classes run to the end of the source.
    return source.length - index;
}

// A lightweight tokenizer that splits a regex source into units and nests the units inside groups, without fully
// parsing it. It works on sources that are not valid regexes (such as interpolations with unterminated groups).
export function tokenizeRegexSource(source: string, { unicode = false, unicodeSets = false }: ScanRegexSourceOptions = {}) {
    unicode ||= unicodeSets;

    const root: RegexSourceUnit[] = [];
    const openGroups: Extract<RegexSourceUnit, { kind: 'group' }>[] = [];
    let unmatchedClose = false;

    let i = 0;
    while (i < source.length) {
        const units = openGroups[openGroups.length - 1]?.children ?? root;
        const ch = source[i]!;
        let length = 1;

        if (ch === '\\') {
            length = escapeLength(source, i, unicode);
            units.push({ kind: 'escape', text: source.slice(i, i + length) });
        } else if (ch === '[') {
            length = charClassLength(source, i, unicodeSets);
            units.push({ kind: 'class', text: source.slice(i, i + length) });
        } else if (ch === '(') {
            length = matchLength(groupPrefix, source, i);
            const group: RegexSourceUnit = { kind: 'group', prefix: source.slice(i, i + length), children: [], closed: false };
            units.push(group);
            openGroups.push(group);
        } else if (ch === ')') {
            if (openGroups.length > 0) {
                openGroups.pop()!.closed = true;
            } else {
                unmatchedClose = true;
                units.push({ kind: 'char', text: ch });
            }
        } else if (ch === '|') {
            units.push({ kind: 'alternation', text: ch });
        } else if (ch === '*' || ch === '+' || ch === '?') {
            if (source[i + 1] === '?') length = 2;
            units.push({ kind: 'quantifier', text: source.slice(i, i + length) });
        } else if (ch === '{' && (length = matchLength(bracedQuantifier, source, i)) > 0) {
            units.push({ kind: 'quantifier', text: source.slice(i, i + length) });
        } else {
            length = 1;
            units.push({ kind: 'char', text: ch });
        }

        i += length;
    }

    return { units: root, depth: openGroups.length, unmatchedClose };
}

export function regexSourceUnitText(unit: RegexSourceUnit): string {
    if (unit.kind !== 'group') return unit.text;
    return unit.prefix + regexSourceUnitsText(unit.children) + (unit.closed ? ')' : '');
}

function regexSourceUnitsText(units: RegexSourceUnit[]): string {
    return units.map(regexSourceUnitText).join('');
}

function isAmbiguousEscape(unit: RegexSourceUnit): boolean {
    return unit.kind === 'escape' && (unit.text === '\\c' || /^\\\d{2,}$/.test(unit.text));
}

function unitCount(units: RegexSourceUnit[]): number {
    return units.reduce((count, unit) => count + (isAmbiguousEscape(unit) ? 2 : 1), 0);
}

export function scanRegexSource(source: string, options: ScanRegexSourceOptions = {}): RegexSourceScan {
    const { units, depth, unmatchedClose } = tokenizeRegexSource(source, options);
    return { depth, unmatchedClose, topLevelUnits: unitCount(units) };
}

export function hasRegexParenErrors(source: string, options: ScanRegexSourceOptions = {}): boolean {
    const { depth, unmatchedClose } = scanRegexSource(source, options);
    return unmatchedClose || depth !== 0;
}

// Single units that can't take a quantifier directly.
const unquantifiableTexts = new Set(['^', '$', '{', '}', ']', ')', '\\b', '\\B']);
const assertionGroupPrefixes = new Set(['(?=', '(?!', '(?<=', '(?<!']);

const assertionTexts = new Set(['^', '$', '\\b', '\\B']);

// Whether the units are all assertions, alternation bars, or groups that only contain the same (including empty
// groups), with at least one assertion somewhere. This errs toward false, since only units that can never consume
// characters are recognized: something that only might consume nothing, such as "a?", is not.
function isNonConsumingUnits(units: RegexSourceUnit[]): boolean {
    let hasAssertion = false;

    const check = (units: RegexSourceUnit[]): boolean => units.every(unit => {
        if (unit.kind === 'alternation') return true;
        if (unit.kind === 'group') {
            if (!unit.closed) return false;
            if (assertionGroupPrefixes.has(unit.prefix)) return hasAssertion = true;
            return check(unit.children);
        }

        if (unit.kind === 'quantifier' || !assertionTexts.has(unit.text)) return false;
        return hasAssertion = true;
    });

    return check(units) && hasAssertion;
}

// Whether the source consumes no characters wherever it matches, because it is made entirely of assertions
// ("^", "$", "\b", "\B", and lookaround groups), possibly inside other groups or between alternation bars.
export function isNonConsumingRegexSource(source: string, options: ScanRegexSourceOptions = {}): boolean {
    const { units, depth, unmatchedClose } = tokenizeRegexSource(source, options);
    return depth === 0 && !unmatchedClose && isNonConsumingUnits(units);
}

// Whether the units are a singleton: exactly one unit that a quantifier can apply to as a whole.
function isSingletonUnits(units: RegexSourceUnit[]): boolean {
    if (unitCount(units) !== 1) return false;

    const unit = units[0]!;
    // Groups that only contain assertions are as meaningless to quantify as the assertions themselves.
    if (unit.kind === 'group') return unit.closed && !assertionGroupPrefixes.has(unit.prefix) && !isNonConsumingUnits(unit.children);
    if (unit.kind === 'quantifier' || unit.kind === 'alternation') return false;
    return !unquantifiableTexts.has(unit.text);
}

// Whether the source is a singleton: exactly one unit that a quantifier can apply to as a whole,
// such as a single character, escape, character class, or group that isn't an assertion and doesn't only contain them. This errs toward
// false, since wrapping a singleton in a group again is harmless, but quantifying a non-singleton is not.
export function isSingletonRegexSource(source: string, options: ScanRegexSourceOptions = {}): boolean {
    const { units, depth, unmatchedClose } = tokenizeRegexSource(source, options);
    return depth === 0 && !unmatchedClose && isSingletonUnits(units);
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

export type RemoveRedundantRegexGroupsOptions = ScanRegexSourceOptions & {
    // Whether nothing will be placed directly before or after the source. When false (the default), the source
    // may be concatenated with other text, so groups at its edges are only removed when that can't change how the
    // surrounding text is read: for example, "(?:\1)" followed by "0" must not become "\10", and a quantifier
    // added after "(?:ab)" must still apply to all of "ab".
    isolated?: boolean;
};

// Characters that could combine with an escape or a brace next to them ("\1" + "0", "\x4" + "1", "a{" + "2}").
const joinableEdge = /[\w{},<]/;

// Removes non-capturing groups that don't change how the source is read. Capturing, named, flag-modifier, and
// lookaround groups are never removed. Sources with unterminated groups or unmatched closing parentheses are
// returned unchanged.
export function removeRedundantRegexGroups(source: string, { isolated = false, ...options }: RemoveRedundantRegexGroupsOptions = {}): string {
    const { units, depth, unmatchedClose } = tokenizeRegexSource(source, options);
    if (depth !== 0 || unmatchedClose) return source;

    // Whether the units still split into the same units once joined as text, so nothing merged across the edges
    // of a removed group (such as an escape absorbing the digit after it, or a literal brace becoming a quantifier).
    const keepsUnits = (candidate: RegexSourceUnit[]): boolean => {
        const reread = tokenizeRegexSource(regexSourceUnitsText(candidate), options).units;
        return reread.length === candidate.length && reread.every((unit, i) => regexSourceUnitText(unit) === regexSourceUnitText(candidate[i]!));
    };

    const normalize = (units: RegexSourceUnit[], atRoot: boolean): RegexSourceUnit[] => {
        const result: RegexSourceUnit[] = [];

        units.forEach((unit, i) => {
            if (unit.kind !== 'group') {
                result.push(unit);
                return;
            }

            const children = normalize(unit.children, false);
            const group = { ...unit, children };

            const prev = result[result.length - 1];
            const next = units[i + 1];
            const startsSource = atRoot && prev === undefined;
            const endsSource = atRoot && next === undefined;
            const singleton = isSingletonUnits(children);
            // Only read when the group has children.
            const firstText = children.length > 0 ? regexSourceUnitText(children[0]!) : '';
            const last = children[children.length - 1]!;

            const removable = (
                group.prefix === '(?:' &&
                children.length > 0 &&
                // A quantifier after the group must still apply to all of its contents.
                (singleton || next?.kind !== 'quantifier') &&
                // Alternatives inside the group must not merge with units outside of it.
                (
                    !children.some(child => child.kind === 'alternation') ||
                    ((prev === undefined || prev.kind === 'alternation') && (next === undefined || next.kind === 'alternation'))
                ) &&
                // Unknown text may be placed before or after the source.
                (isolated || !startsSource || !joinableEdge.test(firstText.charAt(0))) &&
                (isolated || !endsSource || (singleton && last.kind !== 'escape' && !joinableEdge.test(regexSourceUnitText(last).slice(-1)))) &&
                keepsUnits([...result, ...children, ...units.slice(i + 1)])
            );

            if (removable) result.push(...children);
            else result.push(group);
        });

        return result;
    };

    return regexSourceUnitsText(normalize(units, true));
}
