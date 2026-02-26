import { RGXTokenCollection, RGXTokenCollectionInput } from "src/collection";
import { RGXClassToken } from "./base";
import { RGXToken } from "src/types";
import { createAssertClassGuardFunction, createClassGuardFunction, createConstructFunction } from "src/internal";
import { RGXLookaheadToken } from "./lookahead";
import { RGXLookaroundToken } from "./lookaround";

export class RGXLookbehindToken extends RGXLookaroundToken {
    static check = createClassGuardFunction(RGXLookbehindToken);
    static assert = createAssertClassGuardFunction(RGXLookbehindToken);

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
        return new RegExp(result);
    }
}

export const rgxLookbehind = createConstructFunction(RGXLookbehindToken);