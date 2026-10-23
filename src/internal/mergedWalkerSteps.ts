import { RGXGroupToken } from "src/class";

// The groups rgxw creates for runs of steps it merges, so walker step validation can tell them apart.
const mergedWalkerSteps = new WeakSet<RGXGroupToken>();

export function createMergedWalkerStep(tokens: RGXGroupToken["tokens"]): RGXGroupToken {
    const step = new RGXGroupToken({ capturing: false }, tokens);
    mergedWalkerSteps.add(step);
    return step;
}

export function isMergedWalkerStep(value: unknown): value is RGXGroupToken {
    return value instanceof RGXGroupToken && mergedWalkerSteps.has(value);
}
