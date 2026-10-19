import { AST, RegExpParser, RegExpSyntaxError, visitRegExpAST } from "@eslint-community/regexpp";
import { RGXDuplicateGroupNameError, RGXInvalidBackreferenceError, RGXInvalidBackreferenceReason, RGXReservedGroupNameError } from "src/errors";
import { parseRegexSource } from "./analyzeRegexSource";
import { RGXRecordedReference } from "./insertionContext";
import { ScanRegexSourceOptions } from "./scanRegexSource";

export type AssertValidRegexReferencesOptions = ScanRegexSourceOptions & {
    // Group names starting with this are rejected, for names the library adds to the pattern itself.
    reservedGroupPrefix?: string | null;
    // Whether numeric backreferences are rejected, for patterns whose group numbers will shift.
    rejectNumeric?: boolean;
};

const parser = new RegExpParser({ ecmaVersion: 2025 });

// The engine reports duplicate names at the end of the second group's name, without saying which name it is.
function duplicateGroupName(source: string, options: ScanRegexSourceOptions): string | null {
    const unicode = options.unicode || options.unicodeSets;
    try {
        parser.parsePattern(source, 0, source.length, { unicode: unicode && !options.unicodeSets, unicodeSets: options.unicodeSets });
    } catch (err) {
        if (err instanceof RegExpSyntaxError && err.message.includes("Duplicate capture group name")) {
            const nameStart = source.lastIndexOf('<', err.index) + 1;
            return source.slice(nameStart, source.indexOf('>', nameStart));
        }
    }
    return null;
}

function ancestors(node: AST.Node): AST.Node[] {
    const result: AST.Node[] = [];
    for (let current = node.parent; current !== null; current = current.parent) result.push(current);
    return result;
}

function isLookaround(node: AST.Node): node is AST.LookaroundAssertion {
    return node.type === 'Assertion' && (node.kind === 'lookahead' || node.kind === 'lookbehind');
}

// Why the reference can never match what the group captured, or null if it can. This follows the same rules as the
// no-useless-backreference rule in eslint-plugin-regexp.
function invalidReason(reference: AST.Backreference, group: AST.CapturingGroup): RGXInvalidBackreferenceReason | null {
    const referenceAncestors = ancestors(reference);
    if (referenceAncestors.includes(group)) return "inside-group";

    const groupAncestors = ancestors(group);
    const commonIndex = groupAncestors.findIndex(node => referenceAncestors.includes(node));
    const common = groupAncestors[commonIndex]!;
    // Sharing an alternative means both are in the same branch. Anything else they share is the container of
    // the different alternatives they're in.
    if (common.type !== 'Alternative') return "other-branch";

    // A negative lookaround discards its captures once it finishes, whether or not it succeeded.
    if (groupAncestors.slice(0, commonIndex).some(node => isLookaround(node) && node.negate)) return "negative-lookaround";

    // Lookbehinds are matched from right to left, so the group has to come after the reference there.
    const backward = [common, ...ancestors(common)].find(isLookaround)?.kind === 'lookbehind';
    if (backward ? reference.start > group.start : reference.start < group.start) return "before-group";

    return null;
}

const reasonMessages: Record<RGXInvalidBackreferenceReason, string> = {
    "missing-group": "The backreference points to a group that doesn't exist",
    "before-group": "The backreference is matched before its group, so it always matches the empty string",
    "inside-group": "The backreference is inside its own group, so it always matches the empty string",
    "other-branch": "The backreference and its group are in different alternatives, so it always matches the empty string",
    "negative-lookaround": "The backreference's group is inside a negative lookaround, so it always matches the empty string",
    "numeric-in-branches": "Numeric backreferences can't be used in a walker step that is a union, because the walker wraps each branch in a group, which shifts group numbers. Use a named group and reference it by name instead",
};

function invalidReference(reference: RGXRecordedReference, reason: RGXInvalidBackreferenceReason, source: string) {
    return new RGXInvalidBackreferenceError(reasonMessages[reason], reference, reason, source);
}

// Checks the backreferences of a finished pattern, so ones that can never match what their group captured throw
// instead of silently matching the empty string or literal text. references are the backreference tokens recorded
// while building it (see collectRGXReferences), which are needed because the engine reads some broken references as
// literal text: "\k<x>" in a pattern with no named groups, or "\5" in one with fewer than 5 groups. References written
// directly in literal or interpolation tokens can only be checked when the engine reads them as references.
// Sources that are not valid regexes are left for the regex constructor to report, except for duplicate group names,
// which get a clearer error.
export function assertValidRegexReferences(
    source: string, references: readonly RGXRecordedReference[],
    { reservedGroupPrefix = null, rejectNumeric = false, ...options }: AssertValidRegexReferencesOptions = {}
) {
    const ast = parseRegexSource(source, options);
    if (ast === null) {
        const name = duplicateGroupName(source, options);
        if (name !== null) throw new RGXDuplicateGroupNameError("Group names can only repeat in different alternatives", name, source);
        return;
    }

    const groups: AST.CapturingGroup[] = [];
    const backreferences: AST.Backreference[] = [];
    visitRegExpAST(ast, {
        onCapturingGroupEnter: group => { groups.push(group); },
        onBackreferenceEnter: backreference => { backreferences.push(backreference); },
    });

    if (reservedGroupPrefix !== null) {
        const reserved = groups.find(group => group.name?.startsWith(reservedGroupPrefix));
        if (reserved) throw new RGXReservedGroupNameError(`Group names starting with "${reservedGroupPrefix}" are reserved`, reserved.name!, source);
    }

    for (const reference of references) {
        if (rejectNumeric && typeof reference === "number") throw invalidReference(reference, "numeric-in-branches", source);

        const exists = typeof reference === "string" ? groups.some(group => group.name === reference) : reference <= groups.length;
        if (!exists) throw invalidReference(reference, "missing-group", source);
    }

    for (const backreference of backreferences) {
        if (rejectNumeric && typeof backreference.ref === "number") throw invalidReference(backreference.ref, "numeric-in-branches", source);

        // A name used in several alternatives refers to all of their groups, and only one of them needs to work.
        const targets = Array.isArray(backreference.resolved) ? backreference.resolved : [backreference.resolved];
        const reasons = targets.map(group => invalidReason(backreference, group));
        if (reasons.every(reason => reason !== null)) throw invalidReference(backreference.ref, reasons[0]!, source);
    }
}
