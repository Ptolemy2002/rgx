import { AST, visitRegExpAST } from "@eslint-community/regexpp";
import { parseRegexSource } from "./analyzeRegexSource";
import { findRGXAtomicPairs, renumberRGXAtomicGroups, rgxAtomicGroupPrefix } from "./atomicGroups";
import { ScanRegexSourceOptions } from "./scanRegexSource";

// Atomic groups are left out of group numbers everywhere a pattern is built, so numeric backreferences count only the
// other groups. Once a pattern is compiled, its atomic groups get their final names, which are not placeholders any
// more, so a finished source is never finished again, and the numeric backreferences are changed to count them.
const finalPrefix = `${rgxAtomicGroupPrefix}final_`;
const finalNamePattern = new RegExp(`${finalPrefix}(\\d+)`, "g");

// Whether a name is the final name of an atomic group in a compiled pattern.
export function isFinishedRGXAtomicGroupName(name: string): boolean {
    return name.startsWith(finalPrefix);
}

export type RGXFinishedAtomicGroups = {
    source: string;
    // The numbers of the atomic groups in the finished source, in order.
    atomicGroups: number[];
    // Their names in the finished source, in the same order.
    atomicGroupNames: string[];
};

export type RGXAtomicGroupNumbering = {
    groups: AST.CapturingGroup[];
    // The groups numeric backreferences count, in order, so group n is userGroups[n - 1].
    userGroups: AST.CapturingGroup[];
    isAtomic: (group: AST.CapturingGroup) => boolean;
};

// The capture groups of a parsed source, along with the ones its numeric backreferences count.
export function rgxAtomicGroupNumbering(source: string, ast: AST.Pattern, options: ScanRegexSourceOptions): RGXAtomicGroupNumbering {
    const atomicStarts = new Set(findRGXAtomicPairs(source, options).map(pair => pair.groupStart));
    const isAtomic = (group: AST.CapturingGroup) => atomicStarts.has(group.start);
    const groups: AST.CapturingGroup[] = [];
    visitRegExpAST(ast, { onCapturingGroupEnter: group => { groups.push(group); } });
    return { groups, userGroups: groups.filter(group => !isAtomic(group)), isAtomic };
}

type Edit = { start: number, end: number, text: string };

// Gives the atomic groups of a pattern that is about to be compiled their final names, and changes each numeric
// backreference to the number its group has once the atomic groups are counted. References past the last group are
// left alone. A source that isn't a valid regex only has its atomic groups renamed, so compiling it reports its real
// error.
export function finishRGXAtomicGroups(source: string, options: ScanRegexSourceOptions = {}): RGXFinishedAtomicGroups {
    const pairs = findRGXAtomicPairs(source, options);
    if (pairs.length === 0) return { source, atomicGroups: [], atomicGroupNames: [] };

    const ast = parseRegexSource(source, options);
    if (ast === null) return { source: renumberRGXAtomicGroups(source, options), atomicGroups: [], atomicGroupNames: [] };

    const { groups, userGroups } = rgxAtomicGroupNumbering(source, ast, options);
    const edits: Edit[] = [];

    visitRegExpAST(ast, {
        onBackreferenceEnter(reference) {
            if (typeof reference.ref !== "number") return;
            const group = userGroups[reference.ref - 1];
            if (group === undefined) return;
            const number = groups.indexOf(group) + 1;
            if (number === reference.ref) return;
            // A digit can't follow a reference, since it would be read as part of the number, so the new number can't run
            // into one either.
            edits.push({ start: reference.start, end: reference.end, text: `\\${number}` });
        }
    });

    // Names are numbered after any finished atomic groups already in the source (such as from a compiled pattern placed
    // in it), so they don't repeat.
    let next = 0;
    for (const match of source.matchAll(finalNamePattern)) next = Math.max(next, Number(match[1]) + 1);

    const nameLength = rgxAtomicGroupPrefix.length + 6;
    const atomicGroupNames: string[] = [];
    for (const pair of pairs) {
        const name = `${finalPrefix}${next++}`;
        atomicGroupNames.push(name);
        edits.push({ start: pair.definitionName, end: pair.definitionName + nameLength, text: name });
        edits.push({ start: pair.referenceName, end: pair.referenceName + nameLength, text: name });
    }

    let result = source;
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
        result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
    }

    const atomicGroups = pairs.map(pair => groups.findIndex(group => group.start === pair.groupStart) + 1);
    return { source: result, atomicGroups, atomicGroupNames };
}

// Takes the atomic groups out of a match, so its numbers, groups and indices match the pattern as it was built.
export function hideRGXAtomicCaptures<M extends RegExpExecArray>(match: M, atomicGroups: readonly number[], atomicGroupNames: readonly string[]): M {
    if (atomicGroups.length === 0) return match;

    // The d flag adds indices, which aren't in the library's TypeScript target.
    type Captures = { splice(start: number, count: number): unknown, groups?: Record<string, unknown> };
    const indices = (match as unknown as { indices?: Captures }).indices;
    const descending = [...atomicGroups].sort((a, b) => b - a);
    for (const number of descending) {
        match.splice(number, 1);
        indices?.splice(number, 1);
    }

    for (const target of [match as Captures, indices]) {
        if (target?.groups === undefined) continue;
        for (const name of atomicGroupNames) delete target.groups[name];
        if (Object.keys(target.groups).length === 0) target.groups = undefined;
    }
    return match;
}
