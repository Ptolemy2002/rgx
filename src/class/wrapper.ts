import { RGXJSONClassToken, RGXJSONToken, RGXJSONValue, RGXToken } from "src/types";
import { createRGXJSONClassToken, rgxJSONClassArgs, rgxTokenFromJSON, rgxTokenToJSON } from "src/json";
import { RGXClassToken } from "./base";
import { isRGXJSONObjectToken, isRGXJSONToken, isRGXToken } from "src/typeGuards";
import { createConstructFunction, isNonConsumingRGXToken } from "src/internal";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";
import { cloneRGXToken } from "src/clone";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";

function parseWrapperJSONArgs(args: RGXJSONValue[]): [RGXJSONToken] | string {
    if (args.length !== 1) return "Expected exactly 1 argument (token).";
    const [token] = args;
    if (!isRGXJSONToken(token, false)) return "Argument 0 (token) must be a JSON token.";
    return [token];
}

export class RGXClassWrapperToken extends RGXClassToken {
    token: RGXToken;

    static check = createRGXClassGuardFunction(RGXClassWrapperToken);
    static assert = createAssertRGXClassGuardFunction(RGXClassWrapperToken);

    constructor(token: RGXToken) {
        super();
        this.token = token;
    }

    get rgxIsRepeatable(): boolean {
        // JSON tokens become literal, class, or interpolation tokens, so check the converted token instead.
        const token = isRGXJSONObjectToken(this.token, false) ? rgxTokenFromJSON(this.token) : this.token;
        if (isRGXToken(token, 'interpolation', true, false)) return false;
        // Explicit preferences of convertible tokens are kept.
        if (isRGXToken(token, 'convertible', true, false) && token.rgxIsRepeatable !== undefined) return token.rgxIsRepeatable;
        // Otherwise, the wrapper is detected like any other convertible token.
        return !isNonConsumingRGXToken(token);
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

    static fromJSON(json: RGXJSONClassToken): RGXClassWrapperToken {
        const [token] = rgxJSONClassArgs(json, "RGXClassWrapperToken", parseWrapperJSONArgs);
        return new RGXClassWrapperToken(rgxTokenFromJSON(token));
    }

    toJSON(): RGXJSONClassToken {
        return createRGXJSONClassToken("RGXClassWrapperToken", [rgxTokenToJSON(this.token)]);
    }
}

export const rgxClassWrapper = createConstructFunction(RGXClassWrapperToken);