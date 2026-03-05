import { RGXToken } from "src/types";
import { createConstructFunction } from "src/internal";
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

    toRgx(): RGXToken {
        let result: string = this.tokens.toRgx().source;
        if (this.positive) result = `(?=${result})`;
        else result = `(?!${result})`;
        return new RegExp(result);
    }

    clone(depth: CloneDepth="max") {
        if (depth === 0) return this;
        return new RGXLookaheadToken(this.tokens.clone(depthDecrement(depth, 1)), this.positive);
    }
}

export const rgxLookahead = createConstructFunction(RGXLookaheadToken);