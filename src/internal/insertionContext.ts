import { RGXInsertionContext, RGXToken, ValidRegexFlags } from "src/types";
import { assureAcceptance } from "./assureAcceptance";

type RGXInsertionFrame = {
    flags: ValidRegexFlags;
    // The context of the token whose contents are being resolved, or null at the root.
    parent: RGXInsertionContext | null;
    container: RGXToken | null;
    // Whether the container was just placed and resolving it hasn't started yet. This lets resolveRGXToken tell the
    // placement it was called for apart from a new one, so each placement is only checked once.
    pending: boolean;
};

// Resolution is synchronous, so a module-level stack can't leak between calls. A null entry suspends checks, for
// resolutions that aren't part of the pattern being built (such as type guards inspecting a token).
const frames: (RGXInsertionFrame | null)[] = [];

function withFrame<T>(frame: RGXInsertionFrame | null, fn: () => T): T {
    frames.push(frame);
    try {
        return fn();
    } finally {
        frames.pop();
    }
}

function currentFrame(): RGXInsertionFrame | null {
    return frames[frames.length - 1] ?? null;
}

export function isRGXInsertionCheckActive(): boolean {
    return currentFrame() !== null;
}

// Checks insertions made while running fn, as the top level of a pattern with the given flags.
export function withRGXInsertionRoot<T>(flags: ValidRegexFlags, fn: () => T): T {
    return withFrame({ flags, parent: null, container: null, pending: false }, fn);
}

// Also suspends recording backreferences (see collectRGXReferences), since the same resolutions aren't part of the
// pattern being built either.
export function withoutRGXInsertionChecks<T>(fn: () => T): T {
    return withReferenceCollector(null, () => withFrame(null, fn));
}

// Runs fn with the flags of the current level changed, for containers that change the flags of their contents
// (such as modifier groups).
export function withRGXInsertionFlags<T>(transform: (flags: ValidRegexFlags) => ValidRegexFlags, fn: () => T): T {
    const frame = currentFrame();
    if (frame === null) return fn();
    return withFrame({ ...frame, flags: transform(frame.flags), pending: false }, fn);
}

// Checks that siblings[index] accepts being inserted at the current level, then runs resolve with the token as the
// container of a new level. resolve must resolve the token itself. With check set to false, the token is placed
// without being checked, for tokens whose container already passed its own check along to them.
export function placeRGXToken<T>(siblings: readonly RGXToken[], index: number, resolve: () => T, check: boolean = true): T {
    const frame = currentFrame();
    if (frame === null) return resolve();

    const token = siblings[index];
    const context: RGXInsertionContext = Object.freeze({ flags: frame.flags, siblings, index, parent: frame.parent, container: frame.container });
    if (check) assureAcceptance(token, context);

    return withFrame({ flags: frame.flags, parent: context, container: token, pending: true }, resolve);
}

// Called when resolving a token starts. Returns whether the token is the one the current level was just placed for.
export function claimRGXInsertionPlacement(token: RGXToken): boolean {
    const frame = currentFrame();
    // Object.is, since NaN is a valid token that isn't equal to itself.
    if (frame === null || !frame.pending || !Object.is(frame.container, token)) return false;

    frame.pending = false;
    return true;
}

// A group a backreference token points to, by name or by number.
export type RGXRecordedReference = string | number;

// Backreferences are recorded separately from insertion checks, since the walker records them while resolving each
// step without checking insertions. A null entry suspends recording.
const referenceCollectors: (RGXRecordedReference[] | null)[] = [];

function withReferenceCollector<T>(collector: RGXRecordedReference[] | null, fn: () => T): T {
    referenceCollectors.push(collector);
    try {
        return fn();
    } finally {
        referenceCollectors.pop();
    }
}

// Runs fn, returning its result along with every backreference token resolved while it ran. Without this,
// backreferences that the engine reads as literal text (such as "\k<x>" in a pattern with no named groups) can't be
// found in the final source.
export function collectRGXReferences<T>(fn: () => T): [T, RGXRecordedReference[]] {
    const references: RGXRecordedReference[] = [];
    const result = withReferenceCollector(references, fn);
    return [result, references];
}

export function recordRGXReference(reference: RGXRecordedReference) {
    referenceCollectors[referenceCollectors.length - 1]?.push(reference);
}
