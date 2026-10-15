import { RGXJSONClassToken, RGXToken } from "src/types";
import { createRGXJSONClassToken, rgxJSONClassArgs, rgxTokenFromJSON, rgxTokenToJSON } from "src/json";
import { createConstructFunction, createRegexPiece, parseLookaroundJSONArgs } from "src/internal";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";
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

    toRgx(currentFlags: string = ''): RGXToken {
        let result: string = this.tokens.toRgx(currentFlags).source;
        if (this.positive) result = `(?=${result})`;
        else result = `(?!${result})`;
        return createRegexPiece(result, currentFlags);
    }

    clone(depth: CloneDepth="max") {
        if (depth === 0) return this;
        return new RGXLookaheadToken(this.tokens.clone(depthDecrement(depth, 1)), this.positive);
    }

    static fromJSON(json: RGXJSONClassToken): RGXLookaheadToken {
        const [tokens, positive] = rgxJSONClassArgs(json, "RGXLookaheadToken", parseLookaroundJSONArgs);
        return new RGXLookaheadToken(tokens === undefined ? [] : rgxTokenFromJSON(tokens), positive ?? true);
    }

    toJSON(): RGXJSONClassToken {
        return createRGXJSONClassToken("RGXLookaheadToken", [rgxTokenToJSON(this.tokens.tokens), this.positive]);
    }
}

export const rgxLookahead = createConstructFunction(RGXLookaheadToken);