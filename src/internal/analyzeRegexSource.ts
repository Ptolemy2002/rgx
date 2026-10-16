import { AST, RegExpParser, RegExpSyntaxError } from "@eslint-community/regexpp";
import { ScanRegexSourceOptions } from "./scanRegexSource";

const parser = new RegExpParser({ ecmaVersion: 2025 });

// Sources are analyzed many times while a pattern is built (once per level of nesting), so parsed sources are cached.
// The cache is cleared when it fills up rather than evicting entries one at a time, which is simpler and good enough.
const parseCache = new Map<string, AST.Pattern | null>();
const parseCacheLimit = 1000;

// Parses a regex source, or returns null if it is not a valid regex (such as an interpolation with an unterminated
// group). The returned AST is shared through the cache, so it must not be modified.
export function parseRegexSource(source: string, { unicode = false, unicodeSets = false }: ScanRegexSourceOptions = {}): AST.Pattern | null {
    unicode ||= unicodeSets;
    const key = `${unicodeSets ? 'v' : unicode ? 'u' : ''}:${source}`;
    if (parseCache.has(key)) return parseCache.get(key)!;

    let result: AST.Pattern | null;
    try {
        result = parser.parsePattern(source, 0, source.length, { unicode: unicode && !unicodeSets, unicodeSets });
    } catch (err) {
        // This is ignored because I don't know what kind of
        // unexpected errors might happen.
        /* istanbul ignore if */
        if (!(err instanceof RegExpSyntaxError)) throw err;
        result = null;
    }

    if (parseCache.size >= parseCacheLimit) parseCache.clear();
    parseCache.set(key, result);
    return result;
}

// Whether the pattern or element is made entirely of assertions, possibly inside other groups, with at least one
// assertion somewhere. This errs toward false, since only elements that can never consume characters are recognized:
// something that only might consume nothing, such as "a?", is not.
export function isNonConsumingRegexNode(node: AST.Pattern | AST.Element): boolean {
    let hasAssertion = false;

    const check = (node: AST.Pattern | AST.Element): boolean => {
        if (node.type === 'Assertion') return hasAssertion = true;
        if (node.type === 'Pattern' || node.type === 'Group' || node.type === 'CapturingGroup') {
            return node.alternatives.every(alternative => alternative.elements.every(check));
        }
        return false;
    };

    return check(node) && hasAssertion;
}

// Literal characters that are only literals because nothing around them gives them meaning, so text placed next to
// them could (such as "{" followed by "2}").
const unquantifiableCharacters = new Set(['{', '}', ']']);
// "\12" is a backreference or an octal escape depending on how many groups the whole pattern has, which may change
// once the source is placed into a larger pattern.
const contextDependentEscape = /^\\\d{2,}$/;

// Whether the alternatives are a singleton: exactly one element that a quantifier can apply to as a whole.
function isSingletonAlternatives(alternatives: readonly AST.Alternative[]): boolean {
    if (alternatives.length !== 1 || alternatives[0]!.elements.length !== 1) return false;

    const element = alternatives[0]!.elements[0]!;
    switch (element.type) {
        case 'Assertion':
        case 'Quantifier':
            return false;
        // Groups that only contain assertions are as meaningless to quantify as the assertions themselves.
        case 'Group':
        case 'CapturingGroup':
            return !isNonConsumingRegexNode(element);
        case 'Character':
            if (unquantifiableCharacters.has(element.raw)) return false;
            return !contextDependentEscape.test(element.raw);
        case 'Backreference':
            return !contextDependentEscape.test(element.raw);
        default:
            return true;
    }
}

// Whether the source consumes no characters wherever it matches, because it is made entirely of assertions
// ("^", "$", "\b", "\B", and lookarounds), possibly inside other groups or between alternation bars.
export function isNonConsumingRegexSource(source: string, options: ScanRegexSourceOptions = {}): boolean {
    const ast = parseRegexSource(source, options);
    return ast !== null && isNonConsumingRegexNode(ast);
}

// Whether the source is a singleton: exactly one element that a quantifier can apply to as a whole, such as a single
// character, escape, character class, or group that isn't an assertion and doesn't only contain them. This errs
// toward false, since wrapping a singleton in a group again is harmless, but quantifying a non-singleton is not.
export function isSingletonRegexSource(source: string, options: ScanRegexSourceOptions = {}): boolean {
    const ast = parseRegexSource(source, options);
    return ast !== null && isSingletonAlternatives(ast.alternatives);
}

// Returns a singleton equivalent to the source, so a quantifier can be appended to the result. Redundant
// non-capturing groups are removed first (it is safe to treat the source as isolated, since the only thing appended
// to the result is the quantifier, which a non-singleton is protected from by the group added around it).
export function toSingletonRegexSource(source: string, options: ScanRegexSourceOptions = {}): string {
    source = removeRedundantRegexGroups(source, { ...options, isolated: true });
    if (!isSingletonRegexSource(source, options)) return `(?:${source})`;
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

// The units the source is read as, in order, with non-capturing groups that set no flags left out (their alternation
// bars are kept). Removing such a group must not change these, which catches units merging across its edges, such as
// an escape absorbing the digit after it, or a literal brace becoming a quantifier.
function lexicalUnits(source: string, node: AST.Node, out: string[] = []): string[] {
    const addAlternatives = (alternatives: readonly AST.Alternative[]) => alternatives.forEach((alternative, i) => {
        if (i > 0) out.push('|');
        alternative.elements.forEach(element => lexicalUnits(source, element, out));
    });

    if (node.type === 'Pattern' || (node.type === 'Group' && node.modifiers === null)) {
        addAlternatives(node.alternatives);
    } else if (node.type === 'Group' || node.type === 'CapturingGroup' || (node.type === 'Assertion' && (node.kind === 'lookahead' || node.kind === 'lookbehind'))) {
        out.push(source.slice(node.start, node.alternatives[0]!.start));
        addAlternatives(node.alternatives);
        out.push(')');
    } else if (node.type === 'Quantifier') {
        lexicalUnits(source, node.element, out);
        out.push(`{${node.min},${node.max}}${node.greedy ? '' : '?'}`);
    } else {
        out.push(`${node.type}:${node.raw}`);
    }

    return out;
}

function groups(node: AST.Node, out: AST.Group[] = []): AST.Group[] {
    if ('alternatives' in node) node.alternatives.forEach(alternative => alternative.elements.forEach(element => groups(element, out)));
    if (node.type === 'Quantifier') groups(node.element, out);
    // Inner groups come first, so they are removed before the groups around them are considered.
    if (node.type === 'Group') out.push(node);
    return out;
}

// Returns the source with the group removed, or null if removing it could change how the source is read.
function withoutGroup(source: string, ast: AST.Pattern, group: AST.Group, isolated: boolean, options: ScanRegexSourceOptions): string | null {
    // Flag-modifier groups and empty groups are kept.
    if (group.modifiers !== null) return null;
    if (group.alternatives.length === 1 && group.alternatives[0]!.elements.length === 0) return null;

    const singleton = isSingletonAlternatives(group.alternatives);
    const quantified = group.parent.type === 'Quantifier';
    // A quantifier after the group must still apply to all of its contents.
    if (quantified && !singleton) return null;

    // The element the group takes up in its alternative.
    const element: AST.Element = quantified ? group.parent as AST.Quantifier : group;
    const alternative = element.parent as AST.Alternative;
    const index = alternative.elements.indexOf(element);

    // Alternatives inside the group must not merge with elements outside of it.
    if (group.alternatives.length > 1 && alternative.elements.length > 1) return null;

    const contents = source.slice(group.alternatives[0]!.start, group.end - 1);

    // Unknown text may be placed before or after the source.
    if (!isolated && alternative.parent.type === 'Pattern') {
        const alternatives = alternative.parent.alternatives;
        const startsSource = index === 0 && alternative === alternatives[0];
        const endsSource = !quantified && index === alternative.elements.length - 1 && alternative === alternatives[alternatives.length - 1];

        if (startsSource && joinableEdge.test(contents.charAt(0))) return null;
        if (endsSource) {
            const last = group.alternatives[0]!.elements[0]!;
            if (!singleton || last.raw.startsWith('\\') || joinableEdge.test(last.raw.slice(-1))) return null;
        }
    }

    const candidate = source.slice(0, group.start) + contents + source.slice(group.end);
    const reparsed = parseRegexSource(candidate, options);
    if (reparsed === null) return null;

    const before = lexicalUnits(source, ast);
    const after = lexicalUnits(candidate, reparsed);
    if (before.length !== after.length || before.some((unit, i) => unit !== after[i])) return null;

    return candidate;
}

// Removes non-capturing groups that don't change how the source is read. Capturing, named, flag-modifier, and
// lookaround groups are never removed. Sources that are not valid regexes (such as ones with unterminated groups)
// are returned unchanged.
export function removeRedundantRegexGroups(source: string, { isolated = false, ...options }: RemoveRedundantRegexGroupsOptions = {}): string {
    let ast = parseRegexSource(source, options);
    if (ast === null) return source;

    // Removing a group can change whether others can be removed, so groups are removed one at a time, reparsing
    // after each, until none of the remaining groups can be.
    let removed = true;
    while (removed) {
        removed = false;

        for (const group of groups(ast)) {
            const candidate = withoutGroup(source, ast, group, isolated, options);
            if (candidate === null) continue;

            source = candidate;
            ast = parseRegexSource(source, options)!;
            removed = true;
            break;
        }
    }

    return source;
}
