import { RGXJSONClassToken, RGXToken } from "src/types";
import { createRGXJSONClassToken, rgxJSONClassArgs, rgxTokenFromJSON, rgxTokenToJSON } from "src/json";
import { createConstructFunction, parseLookaroundJSONArgs } from "src/internal";
import { createAssertRGXClassGuardFunction, createRegex, createRGXClassGuardFunction } from "src/utils";
import { RGXLookaheadToken } from "./lookahead";
import { RGXLookaroundToken } from "./lookaround";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";

export class RGXLookbehindToken extends RGXLookaroundToken {
    static check = createRGXClassGuardFunction(RGXLookbehindToken);
    static assert = createAssertRGXClassGuardFunction(RGXLookbehindToken);

    negate() {
        return new RGXLookbehindToken(this.tokens, !this.positive);
    }

    reverse() {
        return new RGXLookaheadToken(this.tokens, this.positive);
    }

    toRgx(): RGXToken {
        let result: string = this.tokens.toRgx().source;
        if (this.positive) result = `(?<=${result})`;
        else result = `(?<!${result})`;
        return createRegex(result);
    }

    clone(depth: CloneDepth="max") {
        if (depth === 0) return this;
        return new RGXLookbehindToken(this.tokens.clone(depthDecrement(depth, 1)), this.positive);
    }

    static fromJSON(json: RGXJSONClassToken): RGXLookbehindToken {
        const [tokens, positive] = rgxJSONClassArgs(json, "RGXLookbehindToken", parseLookaroundJSONArgs);
        return new RGXLookbehindToken(tokens === undefined ? [] : rgxTokenFromJSON(tokens), positive ?? true);
    }

    toJSON(): RGXJSONClassToken {
        return createRGXJSONClassToken("RGXLookbehindToken", [rgxTokenToJSON(this.tokens.tokens), this.positive]);
    }
}

export const rgxLookbehind = createConstructFunction(RGXLookbehindToken);