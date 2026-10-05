import { RGXJSONClassToken, RGXJSONToken, RGXJSONValue, RGXToken } from "src/types";
import { createRGXJSONClassToken, rgxJSONClassArgs, rgxTokenFromJSON, rgxTokenToJSON } from "src/json";
import { RGXClassToken } from "./base";
import { isRGXGroupedToken, isRGXJSONObjectToken, isRGXJSONToken, isRGXToken } from "src/typeGuards";
import { createConstructFunction } from "src/internal";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";
import { cloneRGXToken } from "src/clone";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";

export class RGXClassWrapperToken extends RGXClassToken {
    token: RGXToken;

    static check = createRGXClassGuardFunction(RGXClassWrapperToken);
    static assert = createAssertRGXClassGuardFunction(RGXClassWrapperToken);

    constructor(token: RGXToken) {
        super();
        this.token = token;
    }

    get rgxIsGroup(): boolean {
        return isRGXGroupedToken(this.token);
    }

    get rgxIsRepeatable(): boolean {
        // JSON tokens become literal or class tokens, so check the converted token instead.
        const token = isRGXJSONObjectToken(this.token, false) ? rgxTokenFromJSON(this.token) : this.token;
        if (isRGXToken(token, 'convertible', true, false)) return token.rgxIsRepeatable ?? true;
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

    static validateJSONArgs(args: RGXJSONValue[]): boolean | string {
        if (args.length !== 1) return "Expected exactly 1 argument (token).";
        if (!isRGXJSONToken(args[0])) return "Argument 0 (token) must be a JSON token.";
        return true;
    }

    static fromJSON(json: RGXJSONClassToken): RGXClassWrapperToken {
        const [token] = rgxJSONClassArgs(json, "RGXClassWrapperToken", RGXClassWrapperToken.validateJSONArgs) as [RGXJSONToken];
        return new RGXClassWrapperToken(rgxTokenFromJSON(token));
    }

    toJSON(): RGXJSONClassToken {
        return createRGXJSONClassToken("RGXClassWrapperToken", [rgxTokenToJSON(this.token)]);
    }
}

export const rgxClassWrapper = createConstructFunction(RGXClassWrapperToken);