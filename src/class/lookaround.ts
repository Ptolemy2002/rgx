import { RGXTokenCollection, RGXTokenCollectionInput } from "src/collection";
import { RGXClassToken } from "./base";
import { RGXInvalidTokenError } from "src/errors";

export abstract class RGXLookaroundToken extends RGXClassToken {
    tokens: RGXTokenCollection;
    _negative = false;

    // The createClassGuard function only accepts non-abstract classes, so we 
    // manually define the guard and assertion functions for RGXLookaroundToken here.
    static check = (value: unknown): value is RGXLookaroundToken => value instanceof RGXLookaroundToken;
    static assert = (value: unknown): asserts value is RGXLookaroundToken => {
        if (!(value instanceof RGXLookaroundToken)) {
            throw new RGXInvalidTokenError("Invalid token type", { type: "custom", values: ["instance of RGXLookaroundToken"] }, value);
        }
    };

    get isGroup() {
        return true as const;
    }

    get isRepeatable() {
        return false as const;
    }

    get rgxGroupWrap() {
        return false as const;
    }

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

    constructor(tokens: RGXTokenCollectionInput = [], positive: boolean = true) {
        super();
        this.positive = positive;

        if (tokens instanceof RGXTokenCollection && tokens.mode === 'union') this.tokens = new RGXTokenCollection(tokens, 'concat');
        else this.tokens = new RGXTokenCollection(tokens, 'concat');
    }

    abstract negate(): RGXLookaroundToken;
    abstract reverse(): RGXLookaroundToken;
}