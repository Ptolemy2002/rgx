import { RGXToken } from "src/types";
import { RGXClassToken } from "./base";
import { isRGXGroupedToken, isRGXToken } from "src/typeGuards";
import { createAssertClassGuardFunction, createClassGuardFunction, createConstructFunction } from "src/internal";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";
import { cloneRGXToken } from "src/clone";

export class RGXClassWrapperToken extends RGXClassToken {
    token: RGXToken;

    static check = createClassGuardFunction(RGXClassWrapperToken);
    static assert = createAssertClassGuardFunction(RGXClassWrapperToken);

    constructor(token: RGXToken) {
        super();
        this.token = token;
    }

    get rgxIsGroup(): boolean {
        return isRGXGroupedToken(this.token);
    }

    get rgxIsRepeatable(): boolean {
        if (isRGXToken(this.token, 'convertible')) return this.token.rgxIsRepeatable ?? true;
        // Assume any other token is repeatable, since we don't know its implementation.
        return true;
    }

    unwrap(): RGXToken {
        return this.token;
    }

    toRgx(): RGXToken {
        return this.unwrap();
    }

    clone(depth: CloneDepth="max") {
        if (depth === 0) return this;
        return new RGXClassWrapperToken(cloneRGXToken(this.token, depthDecrement(depth, 1)));
    }
}

export const rgxClassWrapper = createConstructFunction(RGXClassWrapperToken);