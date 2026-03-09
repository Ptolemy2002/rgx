import { isRGXGroupedToken, isRGXToken } from "src/typeGuards";
import { RGXConvertibleToken, RGXToken } from "src/types";
import type { RGXWalker } from "./base";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";
import { cloneRGXToken } from "src/clone";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";
import { RGXInvalidPartError, RGXPartValidationFailedError, RGXRegexNotMatchedAtPositionError } from "src/errors";

// Return values from beforeCapture to control walker behavior.
// - void/undefined: proceed normally
// - "skip": skip this token (advance token position, don't capture)
// - "silent": capture (advance source) but don't record in captures
// - "stop": halt immediately (don't capture, don't advance)
export type RGXPartControl = "skip" | "stop" | "silent" | void;

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

export type RGXPartOptions<R, S = unknown, T=string> = {
    id: string;
    rawTransform: (captured: string) => string;
    transform: (captured: string) => T;
    validate: (captured: RGXCapture<T>, context: RGXPartContext<R, S, T>) => boolean | string;
    beforeCapture: ((context: RGXPartContext<R, S, T>) => RGXPartControl) | null;
    afterCapture: ((capture: RGXCapture<T>, context: RGXPartContext<R, S, T>) => void) | null;
    afterFailure: ((e: RGXRegexNotMatchedAtPositionError, context: RGXPartContext<R, S, T>) => void) | null;
    afterValidationFailure: ((e: RGXPartValidationFailedError, context: RGXPartContext<R, S, T>) => void) | null;
};

export class RGXPart<R, S = unknown, T=string> {
    id: string | null;
    token: RGXToken;

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

    constructor(token: RGXToken, options: Partial<RGXPartOptions<R, S, T>> = {}) {
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

    validate(capture: RGXCapture<T>, context: RGXPartContext<R, S, T>) {
        const result = this._validate(capture, context);
        if (result === true) return;
        
        const message = typeof result === "string" ? result : "Part Validation Failed";
        throw new RGXPartValidationFailedError(this.id, message, capture.raw, capture.value);
    }

    // Clone method
    clone(depth: CloneDepth = "max") {
        if (depth === 0) return this;
        return new RGXPart(cloneRGXToken(this.token, depthDecrement(depth, 1)), {
            id: this.id ?? undefined,
            rawTransform: this.rawTransform,
            transform: this.transform,
            beforeCapture: this.beforeCapture,
            afterCapture: this.afterCapture,
        });
    }
}

export function rgxPart<R, S = unknown, T=string>(...args: ConstructorParameters<typeof RGXPart<R, S, T>>) {
    return new RGXPart(...args);
}