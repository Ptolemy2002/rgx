import { AST, visitRegExpAST } from "@eslint-community/regexpp";
import { RGXReservedGroupNameError } from "src/errors";
import { parseRegexSource } from "./analyzeRegexSource";
import { ScanRegexSourceOptions } from "./scanRegexSource";

// Exact text (see RGXExactToken) is written as a named group with this prefix, so it can be found again after it is
// resolved: flag transformers are given the pattern with the text of these groups taken out, and finished patterns are
// compiled with each one replaced by a group that turns the i flag off. Once compiled, they add no capture groups.
export const rgxExactMarkerPrefix = "rgx_exact_";

type RGXExactScope = {
    // Shared by every scope of one build, so names never repeat inside it.
    counter: { next: number };
    // The names created while this scope was open.
    names: Set<string>;
};

// Resolution is synchronous, so module-level stacks can't leak between calls.
const scopes: RGXExactScope[] = [];
const exactStrings: boolean[] = [];

// Runs fn as part of the build that is open, or as a new one if none is. Returns its result along with the names of
// the markers created while it ran.
export function withRGXExactScope<T>(fn: () => T): [T, Set<string>] {
    const parent = scopes[scopes.length - 1];
    const scope: RGXExactScope = { counter: parent?.counter ?? { next: 0 }, names: new Set() };
    scopes.push(scope);
    try {
        return [fn(), scope.names];
    } finally {
        scopes.pop();
    }
}

export function isRGXExactScopeActive(): boolean {
    return scopes.length > 0;
}

// A marker name that is unique in the build that is open.
export function nextRGXExactMarkerName(): string {
    const counter = scopes[scopes.length - 1]?.counter ?? { next: 0 };
    const name = `${rgxExactMarkerPrefix}${counter.next++}`;
    for (const scope of scopes) scope.names.add(name);
    return name;
}

// Runs fn with native strings resolved as exact text (or not). null keeps the setting in effect.
export function withRGXExactStrings<T>(value: boolean | null, fn: () => T): T {
    if (value === null) return fn();
    exactStrings.push(value);
    try {
        return fn();
    } finally {
        exactStrings.pop();
    }
}

export function isRGXExactStringsActive(): boolean {
    return exactStrings[exactStrings.length - 1] ?? false;
}

// Exact text that has letters (or any non-ASCII character) has to turn the i flag off. Escapes like "\x2d" aren't
// letters, so they are left out first.
function needsCaseSensitivity(content: string): boolean {
    return /[^\x00-\x40\x5b-\x60\x7b-\x7f]/.test(content.replaceAll(/\\x[0-9a-fA-F]{2}|\\./g, ""));
}

// The exact text of a marker, written so it ignores the i flag around it.
export function rgxExactMarkerReplacement(content: string): string {
    return needsCaseSensitivity(content) ? `(?-i:${content})` : `(?:${content})`;
}

export type RGXExactMarker = {
    name: string;
    start: number;
    end: number;
    contentStart: number;
    contentEnd: number;
};

// A source can be valid in some unicode modes and not others (as with the pieces of a pattern), so the mode in effect is
// tried first, then the others.
function parseAnyMode(source: string, options: ScanRegexSourceOptions): AST.Pattern | null {
    const candidates: ScanRegexSourceOptions[] = [options, {}, { unicode: true }, { unicodeSets: true }];
    for (const candidate of candidates) {
        const ast = parseRegexSource(source, candidate);
        if (ast !== null) return ast;
    }
    return null;
}

function isMarkerName(name: string | null, names: ReadonlySet<string> | null): name is string {
    if (name === null || !name.startsWith(rgxExactMarkerPrefix)) return false;
    return names === null || names.has(name);
}

// The markers in the source, by the names given (or every group with the prefix, for null).
// Sources that are not valid regexes have none.
export function findRGXExactMarkers(source: string, names: ReadonlySet<string> | null, options: ScanRegexSourceOptions): RGXExactMarker[] {
    if (names !== null && names.size === 0) return [];
    if (!source.includes(rgxExactMarkerPrefix)) return [];

    const ast = parseAnyMode(source, options);
    if (ast === null) return [];

    const markers: RGXExactMarker[] = [];
    visitRegExpAST(ast, {
        onCapturingGroupEnter(group) {
            if (!isMarkerName(group.name, names)) return;
            // The contents start after "(?<name>".
            const contentStart = group.start + group.name.length + 4;
            markers.push({ name: group.name, start: group.start, end: group.end, contentStart, contentEnd: group.end - 1 });
        }
    });
    return markers;
}

// Replaces each marker with what replace returns for it. Markers hold only escaped text, so they never nest.
export function replaceRGXExactMarkers(
    source: string, markers: readonly RGXExactMarker[], replace: (marker: RGXExactMarker, content: string) => string
): string {
    let result = source;
    for (const marker of [...markers].sort((a, b) => b.start - a.start)) {
        result = result.slice(0, marker.start) + replace(marker, source.slice(marker.contentStart, marker.contentEnd)) + result.slice(marker.end);
    }
    return result;
}

// The source with every marker given a new name from the build that is open, for a source that is placed again (such
// as one built separately, or a piece that is repeated).
export function renumberRGXExactMarkers(source: string, names: ReadonlySet<string> | null, options: ScanRegexSourceOptions): string {
    const markers = findRGXExactMarkers(source, names, options);
    if (markers.length === 0) return source;

    // Named in order, then replaced from the end, which keeps the positions of the earlier markers valid.
    const renamed = markers.map(marker => ({ marker, name: nextRGXExactMarkerName() }));
    let result = source;
    for (const { marker, name } of renamed.reverse()) {
        const nameStart = marker.start + 3;
        result = result.slice(0, nameStart) + name + result.slice(nameStart + marker.name.length);
    }
    return result;
}

// Group names with the prefix are reserved in a pattern that has exact text, so its markers can't be confused with
// groups written by hand. names are the markers the pattern was built with.
export function assertRGXExactMarkerNames(source: string, names: ReadonlySet<string>, options: ScanRegexSourceOptions) {
    if (names.size === 0) return;

    const foreign = findRGXExactMarkers(source, null, options).find(marker => !names.has(marker.name));
    if (foreign) {
        throw new RGXReservedGroupNameError(`Group names starting with "${rgxExactMarkerPrefix}" are reserved in patterns with exact text`, foreign.name, source);
    }
}

// The source to compile: every marker is replaced by its exact text, written so it ignores the i flag, which adds no
// capture group. names are the markers to replace, or null for every group with the prefix.
export function compileRGXExactMarkers(source: string, names: ReadonlySet<string> | null, options: ScanRegexSourceOptions): string {
    const markers = findRGXExactMarkers(source, names, options);
    if (markers.length === 0) return source;
    return replaceRGXExactMarkers(source, markers, (_, content) => rgxExactMarkerReplacement(content));
}

// Checks the markers of a finished pattern built with the names given, and compiles them.
export function finishRGXExactMarkers(source: string, names: ReadonlySet<string>, options: ScanRegexSourceOptions = {}): string {
    assertRGXExactMarkerNames(source, names, options);
    return compileRGXExactMarkers(source, names, options);
}

// Resolves a finished pattern with fn, in a build of its own if none is open, returning it ready to compile.
export function resolveFinishedRGXSource(fn: () => string, options: ScanRegexSourceOptions = {}): string {
    const [source, names] = withRGXExactScope(fn);
    return finishRGXExactMarkers(source, names, options);
}
