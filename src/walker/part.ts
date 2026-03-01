import { isRGXGroupedToken, isRGXToken } from "src/typeGuards";
import { RGXConvertibleToken, RGXToken } from "src/types";
import type { RGXWalker } from "./base";
import { createAssertClassGuardFunction, createClassGuardFunction } from "src/internal";
import { cloneRGXToken } from "src/clone";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";
import { RGXPartValidationFailedError } from "src/errors";

// Return values from beforeCapture to control walker behavior.
// - void/undefined: proceed normally
// - "skip": skip this token (advance token position, don't capture)
// - "silent": capture (advance source) but don't record in captures
// - "stop": halt immediately (don't capture, don't advance)
export type RGXPartControl = "skip" | "stop" | "silent" | void;

// A structured capture result, replacing the flat string array.
// Defaults to unknown — use RGXCapture<T> in Part callbacks for typed access.
export type RGXCapture<T = unknown> = {
    raw: string;
    value: T;
};

export type RGXPartOptions<R, T=string> = {
    transform: (captured: string) => T;
    validate: (captured: RGXCapture<T>, part: RGXPart<R, T>, walker: RGXWalker<R>) => boolean | string;
    beforeCapture: ((part: RGXPart<R, T>, walker: RGXWalker<R>) => RGXPartControl) | null;
    afterCapture: ((capture: RGXCapture<T>, part: RGXPart<R, T>, walker: RGXWalker<R>) => void) | null;
}

// A Part is purely a definition: a token + optional callbacks.
// It does NOT store capture state — that lives on the walker.
export class RGXPart<R, T=string> implements RGXConvertibleToken {
    token: RGXToken;

    readonly transform: RGXPartOptions<R, T>["transform"];
    private readonly _validate: RGXPartOptions<R, T>["validate"];
    readonly beforeCapture: RGXPartOptions<R, T>["beforeCapture"];
    readonly afterCapture: RGXPartOptions<R, T>["afterCapture"];

    static check = createClassGuardFunction(RGXPart);
    static assert = createAssertClassGuardFunction(RGXPart);

    constructor(token: RGXToken, options: Partial<RGXPartOptions<R, T>> = {}) {
        this.token = token;
        this.transform = options.transform ?? ((captured: string) => captured as unknown as T);
        this._validate = options.validate ?? (() => true);
        this.beforeCapture = options.beforeCapture ?? null;
        this.afterCapture = options.afterCapture ?? null;
    }

    validate(capture: RGXCapture<T>, walker: RGXWalker<R>) {
        const result = this._validate(capture, this, walker);
        if (result === true) return;
        
        const message = typeof result === "string" ? result : "Part Validation Failed";
        throw new RGXPartValidationFailedError(message, capture.raw, capture.value);
    }

    // Properties used for conversion to an RGXToken
    get rgxIsGroup() {
        return isRGXGroupedToken(this.token);
    }

    get rgxIsRepeatable() {
        if (isRGXToken(this.token, 'convertible')) return this.token.rgxIsRepeatable ?? true;
        // Assume any other token is repeatable, since we don't know its implementation.
        return true;
    }

    toRgx() {
        return this.token;
    }

    // Clone method
    clone(depth: CloneDepth = "max") {
        if (depth === 0) return this;
        return new RGXPart(cloneRGXToken(this.token, depthDecrement(depth, 1)), {
            transform: this.transform,
            beforeCapture: this.beforeCapture,
            afterCapture: this.afterCapture,
        });
    }
}

export function rgxPart<R, T=string>(...args: ConstructorParameters<typeof RGXPart<R, T>>) {
    return new RGXPart(...args);
}