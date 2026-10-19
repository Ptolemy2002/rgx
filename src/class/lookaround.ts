import { RGXToken } from "src/types";
import { RGXClassToken } from "./base";
import { RGXInvalidTokenError } from "src/errors";

export abstract class RGXLookaroundToken extends RGXClassToken {
    tokens: RGXToken[];
    _negative = false;

    // The createClassGuard function only accepts non-abstract classes, so we 
    // manually define the guard and assertion functions for RGXLookaroundToken here.
    static check = (value: unknown): value is RGXLookaroundToken => value instanceof RGXLookaroundToken;
    static assert = (value: unknown): asserts value is RGXLookaroundToken => {
        if (!(value instanceof RGXLookaroundToken)) {
            throw new RGXInvalidTokenError("Invalid token type", { type: "custom", values: ["instance of RGXLookaroundToken"] }, value);
        }
    };

    set negative(value: boolean) {
        this._negative = value;
    }

    get negative() {
        return this._negative;
    }

    set positive(value: boolean) {
        this.negative = !value;
    }

    get positive() {
        return !this.negative;
    }

    constructor(tokens: RGXToken = [], positive: boolean = true) {
        super();
        this.positive = positive;

        // An array lists the tokens to concatenate. Anything else, including a union, is a single token.
        this.tokens = Array.isArray(tokens) ? [...tokens] : [tokens];
    }

    abstract negate(): RGXLookaroundToken;
    abstract reverse(): RGXLookaroundToken;
}
