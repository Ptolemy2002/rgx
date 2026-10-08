import { RGXTokenCollection, RGXTokenCollectionInput } from "src/collection";
import { RGXClassToken } from "./base";
import { RGXInvalidTokenError } from "src/errors";
import { RGXJSONValue } from "src/types";
import { isRGXJSONToken } from "src/typeGuards";

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

    get rgxIsGroup() {
        return true as const;
    }

    get rgxIsRepeatable() {
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

        if (tokens instanceof RGXTokenCollection && tokens.mode === 'union') this.tokens = new RGXTokenCollection([tokens], 'concat');
        else this.tokens = new RGXTokenCollection(tokens, 'concat');
    }

    abstract negate(): RGXLookaroundToken;
    abstract reverse(): RGXLookaroundToken;
}

// Shared argument validation for the lookahead and lookbehind JSON forms.
export function validateLookaroundJSONArgs(args: RGXJSONValue[]): boolean | string {
    if (args.length > 2) return "Expected at most 2 arguments (tokens, positive).";

    const [tokens, positive] = args;
    if (tokens !== undefined && !isRGXJSONToken(tokens)) return "Argument 0 (tokens) must be a JSON token.";
    if (positive !== undefined && typeof positive !== "boolean") return "Argument 1 (positive) must be a boolean, if present.";
    return true;
}