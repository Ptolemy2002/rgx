import { RGXJSONClassToken, RGXJSONToken, RGXJSONValue, RGXToken } from "src/types";
import { createRGXJSONClassToken, rgxJSONClassArgs, rgxTokenFromJSON, rgxTokenToJSON } from "src/json";
import { validateLookaroundJSONArgs } from "./lookaround";
import { createConstructFunction } from "src/internal";
import { createAssertRGXClassGuardFunction, createRegex, createRGXClassGuardFunction } from "src/utils";
import { RGXLookaroundToken } from "./lookaround";
import { RGXLookbehindToken } from "./lookbehind";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";

export class RGXLookaheadToken extends RGXLookaroundToken {
    static check = createRGXClassGuardFunction(RGXLookaheadToken);
    static assert = createAssertRGXClassGuardFunction(RGXLookaheadToken);

    negate() {
        return new RGXLookaheadToken(this.tokens, !this.positive);
    }

    reverse() {
        return new RGXLookbehindToken(this.tokens, this.positive);
    }

    toRgx(): RGXToken {
        let result: string = this.tokens.toRgx().source;
        if (this.positive) result = `(?=${result})`;
        else result = `(?!${result})`;
        return createRegex(result);
    }

    clone(depth: CloneDepth="max") {
        if (depth === 0) return this;
        return new RGXLookaheadToken(this.tokens.clone(depthDecrement(depth, 1)), this.positive);
    }

    static validateJSONArgs(args: RGXJSONValue[]): boolean | string {
        return validateLookaroundJSONArgs(args);
    }

    static fromJSON(json: RGXJSONClassToken): RGXLookaheadToken {
        const [tokens, positive] = rgxJSONClassArgs(json, "RGXLookaheadToken", RGXLookaheadToken.validateJSONArgs) as [RGXJSONToken?, boolean?];
        return new RGXLookaheadToken(tokens === undefined ? [] : rgxTokenFromJSON(tokens), positive ?? true);
    }

    toJSON(): RGXJSONClassToken {
        return createRGXJSONClassToken("RGXLookaheadToken", [rgxTokenToJSON(this.tokens.tokens), this.positive]);
    }
}

export const rgxLookahead = createConstructFunction(RGXLookaheadToken);