import { isRGXGroupedToken, isRGXToken } from "src/typeGuards";
import { RGXConvertibleToken, RGXToken } from "src/types";
import type { RGXWalker } from "./base";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";
import { cloneRGXToken } from "src/clone";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";
import { RGXInvalidPartError, RGXPartValidationFailedError } from "src/errors";

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

export type RGXPartOptions<R, T=string> = {
    id: string;
    rawTransform: (captured: string) => string;
    transform: (captured: string) => T;
    validate: (captured: RGXCapture<T>, part: RGXPart<R, T>, walker: RGXWalker<R>) => boolean | string;
    beforeCapture: ((part: RGXPart<R, T>, walker: RGXWalker<R>) => RGXPartControl) | null;
    afterCapture: ((capture: RGXCapture<T>, part: RGXPart<R, T>, walker: RGXWalker<R>) => void) | null;
};

export class RGXPart<R, T=string> {
    id: string | null;
    token: RGXToken;

    readonly rawTransform: RGXPartOptions<R, T>["rawTransform"];
    readonly transform: RGXPartOptions<R, T>["transform"];
    private readonly _validate: RGXPartOptions<R, T>["validate"];
    readonly beforeCapture: RGXPartOptions<R, T>["beforeCapture"];
    readonly afterCapture: RGXPartOptions<R, T>["afterCapture"];

    static check = createRGXClassGuardFunction(RGXPart);
    static assert = createAssertRGXClassGuardFunction(RGXPart,
        (value, constructor) => new RGXInvalidPartError("Invalid Part", value, constructor.name)
    );

    constructor(token: RGXToken, options: Partial<RGXPartOptions<R, T>> = {}) {
        this.id = options.id ?? null;
        this.token = token;
        this.rawTransform = options.rawTransform ?? (captured => captured);
        this.transform = options.transform ?? ((captured: string) => captured as unknown as T);
        this._validate = options.validate ?? (() => true);
        this.beforeCapture = options.beforeCapture ?? null;
        this.afterCapture = options.afterCapture ?? null;
    }

    hasId(): this is RGXPart<R, T> & { id: string } {
        return this.id !== null;
    }

    validate(capture: RGXCapture<T>, walker: RGXWalker<R>) {
        const result = this._validate(capture, this, walker);
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

export function rgxPart<R, T=string>(...args: ConstructorParameters<typeof RGXPart<R, T>>) {
    return new RGXPart(...args);
}