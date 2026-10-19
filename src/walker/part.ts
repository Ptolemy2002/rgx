import { RGXConvertibleToken, RGXToken } from "src/types";
import type { RGXWalker } from "./base";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";
import { cloneRGXToken } from "src/clone";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";
import { RGXInvalidPartError, RGXPartValidationFailedError, RGXRegexNotMatchedAfterPositionError, RGXRegexNotMatchedAtPositionError } from "src/errors";
import { assertRGXToken } from "src/typeGuards";

// Return values from beforeCapture to control walker behavior.
// - void/undefined: proceed normally
// - "skip": skip this token (advance token position, don't capture)
// - "silent": capture (advance source) but don't record in captures
// - "stop": halt immediately (don't capture, don't advance)
// - "stop-silent": halt immediately but don't record in captures
export type RGXPartControl = "skip" | "stop" | "silent" | "stop-silent" | void;

export type RGXCapture<T = unknown> = {
    raw: string;
    value: T;
    start: number;
    end: number;
    ownerId: string | null; // The id of the RGXPart that captured this, if any
    branch: number; // The branch index of the token that captured this, or 0 if there is only one branch
    groups: Record<string, string> | null; // The groups captured by the token that captured this, or null if the token didn't capture any groups
};

export type RGXPartContext<R, S= unknown, T=string> = {
    part: RGXPart<R, S, T>;
    walker: RGXWalker<R, S>;
};

// A token, or a function that produces one from the walker's current state each time the part is captured.
export type RGXPartToken<R, S = unknown, T = string> = RGXToken | ((context: RGXPartContext<R, S, T>) => RGXToken);

export type RGXPartOptions<R, S = unknown, T=string> = {
    id: string;
    rawTransform: (captured: string) => string;
    transform: (captured: string) => T;
    validate: (captured: RGXCapture<T>, context: RGXPartContext<R, S, T>) => boolean | string;
    beforeCapture: ((context: RGXPartContext<R, S, T>) => RGXPartControl) | null;
    afterCapture: ((capture: RGXCapture<T>, context: RGXPartContext<R, S, T>) => RGXPartControl) | null;
    afterFailure: ((e: RGXRegexNotMatchedAtPositionError | RGXRegexNotMatchedAfterPositionError, context: RGXPartContext<R, S, T>) => RGXPartControl) | null;
    afterValidationFailure: ((e: RGXPartValidationFailedError, context: RGXPartContext<R, S, T>) => RGXPartControl) | null;
};

export class RGXPart<R, S = unknown, T=string> {
    id: string | null;
    token: RGXPartToken<R, S, T>;

    readonly rawTransform: RGXPartOptions<R, S, T>["rawTransform"];
    readonly transform: RGXPartOptions<R, S, T>["transform"];
    private readonly _validate: RGXPartOptions<R, S, T>["validate"];
    readonly beforeCapture: RGXPartOptions<R, S, T>["beforeCapture"];
    readonly afterCapture: RGXPartOptions<R, S, T>["afterCapture"];
    readonly afterFailure: RGXPartOptions<R, S, T>["afterFailure"];
    readonly afterValidationFailure: RGXPartOptions<R, S, T>["afterValidationFailure"];

    static check = createRGXClassGuardFunction(RGXPart);
    static assert = createAssertRGXClassGuardFunction(RGXPart,
        (value, constructor) => new RGXInvalidPartError("Invalid Part", value, constructor.name)
    );

    constructor(token: RGXPartToken<R, S, T>, options: Partial<RGXPartOptions<R, S, T>> = {}) {
        this.id = options.id ?? null;
        this.token = token;
        this.rawTransform = options.rawTransform ?? (captured => captured);
        this.transform = options.transform ?? ((captured: string) => captured as unknown as T);
        this._validate = options.validate ?? (() => true);
        this.beforeCapture = options.beforeCapture ?? null;
        this.afterCapture = options.afterCapture ?? null;
        this.afterFailure = options.afterFailure ?? null;
        this.afterValidationFailure = options.afterValidationFailure ?? null;
    }

    hasId(): this is RGXPart<R, S, T> & { id: string } {
        return this.id !== null;
    }

    // Whether the token is produced by a function each time the part is captured.
    isDynamic(): this is RGXPart<R, S, T> & { token: (context: RGXPartContext<R, S, T>) => RGXToken } {
        return typeof this.token === "function";
    }

    // The token to match the part with, given the walker's current state.
    resolveToken(walker: RGXWalker<R, S>): RGXToken {
        if (!this.isDynamic()) return this.token as RGXToken;

        const token = this.token({ part: this, walker });
        assertRGXToken(token);
        return token;
    }

    validate(capture: RGXCapture<T>, context: RGXPartContext<R, S, T>) {
        const result = this._validate(capture, context);
        if (result === true) return;
        
        const message = typeof result === "string" ? result : "Part Validation Failed";
        throw new RGXPartValidationFailedError(this.id, message, capture.raw, capture.value);
    }

    // Clone method
    clone(depth: CloneDepth = "max") {
        if (depth === 0) return this;
        // Functions are shared, the same way the callbacks are.
        const token = this.isDynamic() ? this.token : cloneRGXToken(this.token as RGXToken, depthDecrement(depth, 1));
        return new RGXPart(token, {
            id: this.id ?? undefined,
            rawTransform: this.rawTransform,
            transform: this.transform,
            beforeCapture: this.beforeCapture,
            afterCapture: this.afterCapture,
            afterFailure: this.afterFailure,
            afterValidationFailure: this.afterValidationFailure,
        });
    }
}

export function rgxPart<R, S = unknown, T=string>(...args: ConstructorParameters<typeof RGXPart<R, S, T>>) {
    return new RGXPart(...args);
}