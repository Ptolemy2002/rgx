import { RGXToken } from "src/types";
import { createAssertClassGuardFunction, createClassGuardFunction, createConstructFunction } from "src/internal";
import { RGXLookaroundToken } from "./lookaround";
import { RGXLookbehindToken } from "./lookbehind";

export class RGXLookaheadToken extends RGXLookaroundToken {
    static check = createClassGuardFunction(RGXLookaheadToken);
    static assert = createAssertClassGuardFunction(RGXLookaheadToken);

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
}

export const rgxLookahead = createConstructFunction(RGXLookaheadToken);