import { RGXConvertibleToken, RGXToken } from "src/types";
import type { RGXTokenOrPart, RGXWalker } from "./base";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";
import { cloneRGXToken } from "src/clone";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";
import { RGXInvalidPartError, RGXNotSupportedError, RGXPartValidationFailedError, RGXRegexNotMatchedAfterPositionError, RGXRegexNotMatchedAtPositionError } from "src/errors";
import { assertRGXToken } from "src/typeGuards";
import { getRGXPartAlias } from "./partAlias";

// Return values from beforeCapture to control walker behavior.
// - void/undefined: proceed normally
// - "skip": skip this token (advance token position, don't capture)
// - "silent": capture (advance source) but don't record in captures
// - "stop": halt immediately (don't capture, don't advance)
// - "stop-silent": halt immediately but don't record in captures
export type RGXPartControl = "skip" | "stop" | "silent" | "stop-silent" | void;

// Return values from afterLoss. A part that wasn't picked can't undo the step, since it already captured.
// - void/undefined: proceed normally
// - "silent": don't record the winning capture, but continue normally
// - "stop": record the winning capture, then halt
// - "stop-silent": halt without recording the winning capture
export type RGXPartLossControl = "silent" | "stop" | "stop-silent" | void;

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

// Why a part in a union wasn't picked when another branch captured:
// - "no-match": it comes before the winner, so it was tried at the winning position and didn't match there
// - "not-reached": it comes after the winner, so it was never tried
export type RGXPartLossReason = "no-match" | "not-reached";

export type RGXPartLoss<R, S = unknown> = {
    reason: RGXPartLossReason;
    // The alternative that captured: a part, or a plain token.
    winner: RGXTokenOrPart<R, S>;
    capture: RGXCapture;
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
    afterLoss: ((loss: RGXPartLoss<R, S>, context: RGXPartContext<R, S, T>) => RGXPartLossControl) | null;
};

export class RGXPart<R, S = unknown, T=string> {
    private _id: string | null;
    private _token: RGXPartToken<R, S, T>;
    private readonly _options: Omit<RGXPartOptions<R, S, T>, "id">;
    // The alias this part refers to, or null for a part defined here.
    readonly alias: string | null = null;

    static check = createRGXClassGuardFunction(RGXPart);
    static assert = createAssertRGXClassGuardFunction(RGXPart,
        (value, constructor) => new RGXInvalidPartError("Invalid Part", value, constructor.name)
    );

    // A part that refers to the part registered under the alias (see registerRGXPartAlias), looking it up each time it
    // is used. It behaves exactly like that part, and can be used anywhere a part can, such as a walker step.
    static fromAlias<R, S = unknown, T = string>(alias: string): RGXPart<R, S, T> {
        const part = new RGXPart<R, S, T>(null);
        (part as { alias: string | null }).alias = alias;
        return part;
    }

    // The part this one behaves as: the registered part for an alias, and itself otherwise.
    target(): RGXPart<R, S, T> {
        return this.alias === null ? this : getRGXPartAlias<R, S, T>(this.alias).target();
    }

    private assertNotAlias(property: string) {
        if (this.alias !== null) throw new RGXNotSupportedError(`Setting ${property} on a part alias`, "A part alias takes its properties from the registered part.");
    }

    get id(): string | null {
        return this.alias === null ? this._id : this.target().id;
    }

    set id(value: string | null) {
        this.assertNotAlias("id");
        this._id = value;
    }

    get token(): RGXPartToken<R, S, T> {
        return this.alias === null ? this._token : this.target().token;
    }

    set token(value: RGXPartToken<R, S, T>) {
        this.assertNotAlias("token");
        this._token = value;
    }

    private option<K extends keyof RGXPartOptions<R, S, T>>(key: K): RGXPartOptions<R, S, T>[K] {
        return (this.alias === null ? this._options : this.target()._options)[key as Exclude<K, "id">] as RGXPartOptions<R, S, T>[K];
    }

    get rawTransform() { return this.option("rawTransform"); }
    get transform() { return this.option("transform"); }
    get beforeCapture() { return this.option("beforeCapture"); }
    get afterCapture() { return this.option("afterCapture"); }
    get afterFailure() { return this.option("afterFailure"); }
    get afterValidationFailure() { return this.option("afterValidationFailure"); }
    get afterLoss() { return this.option("afterLoss"); }

    constructor(token: RGXPartToken<R, S, T>, options: Partial<RGXPartOptions<R, S, T>> = {}) {
        this._id = options.id ?? null;
        this._token = token;
        this._options = {
            rawTransform: options.rawTransform ?? (captured => captured),
            transform: options.transform ?? ((captured: string) => captured as unknown as T),
            validate: options.validate ?? (() => true),
            beforeCapture: options.beforeCapture ?? null,
            afterCapture: options.afterCapture ?? null,
            afterFailure: options.afterFailure ?? null,
            afterValidationFailure: options.afterValidationFailure ?? null,
            afterLoss: options.afterLoss ?? null,
        };
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
        const result = this.option("validate")(capture, context);
        if (result === true) return;
        
        const message = typeof result === "string" ? result : "Part Validation Failed";
        throw new RGXPartValidationFailedError(this.id, message, capture.raw, capture.value);
    }

    // Clone method
    clone(depth: CloneDepth = "max"): RGXPart<R, S, T> {
        if (depth === 0) return this;
        // An alias keeps referring to the registered part.
        if (this.alias !== null) return RGXPart.fromAlias<R, S, T>(this.alias);
        // Functions are shared, the same way the callbacks are.
        const token = this.isDynamic() ? this.token : cloneRGXToken(this.token as RGXToken, depthDecrement(depth, 1));
        return new RGXPart(token, { id: this.id ?? undefined, ...this._options });
    }
}

export function rgxPart<R, S = unknown, T=string>(...args: ConstructorParameters<typeof RGXPart<R, S, T>>) {
    return new RGXPart(...args);
}

export function rgxPartAlias<R, S = unknown, T = string>(alias: string): RGXPart<R, S, T> {
    return RGXPart.fromAlias<R, S, T>(alias);
}