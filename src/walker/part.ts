import { isRGXGroupedToken, isRGXToken } from "src/typeGuards";
import { RGXConvertibleToken, RGXToken } from "src/types";
import type { RGXWalker } from "./base";
import { createAssertClassGuardFunction, createClassGuardFunction } from "src/internal";
import { cloneRGXToken } from "src/clone";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";

export type RGXPartEventType = "pre-capture" | "post-capture";
export type RGXPartOptions<R, T=string> = {
    transform: (captured: string) => T;
    onEvent: ((part: RGXPart<R, T>, eventType: RGXPartEventType, walker: RGXWalker<R>) => void) | null;
}

export class RGXPart<R, T=string> implements RGXConvertibleToken {
    token: RGXToken;

    capturedString: string | null = null;
    capturedValue: T | null = null;

    readonly transform: RGXPartOptions<R, T>["transform"];
    readonly onEvent: RGXPartOptions<R, T>["onEvent"];

    static check = createClassGuardFunction(RGXPart);
    static assert = createAssertClassGuardFunction(RGXPart);

    constructor(token: RGXToken, options: Partial<RGXPartOptions<R, T>> = {}) {
        this.token = token;
        this.transform = options.transform ?? ((captured: string) => captured as unknown as T);
        this.onEvent = options.onEvent ?? null;
    }

    triggerEvent(eventType: RGXPartEventType, walker: RGXWalker<R>) {
        switch (eventType) {
            case "post-capture": {
                this.capturedString = walker.getLastCapturedString()!;
                this.capturedValue = this.transform(this.capturedString);
                break;
            }
        }

        this.onEvent?.(this, eventType, walker);
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
        return new RGXPart(cloneRGXToken(this.token, depthDecrement(depth, 1)), { transform: this.transform, onEvent: this.onEvent });
    }
}

export function rgxPart<R, T=string>(...args: ConstructorParameters<typeof RGXPart<R, T>>) {
    return new RGXPart(...args);
}