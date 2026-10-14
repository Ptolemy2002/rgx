import { RGXJSONClassToken, RGXJSONToken, RGXJSONValue, RGXToken } from "src/types";
import { createRGXJSONClassToken, rgxJSONClassArgs, rgxTokenFromJSON, rgxTokenToJSON } from "src/json";
import { RGXClassToken } from "./base";
import { isRGXConvertibleToken, isRGXJSONObjectToken, isRGXJSONToken, isRGXToken } from "src/typeGuards";
import { assertInRange, RGXNotSupportedError } from "src/errors";
import { resolveRGXToken } from "src/resolve";
import { createConstructFunction, isNonConsumingRGXToken, toSingletonRegexSource } from "src/internal";
import { createAssertRGXClassGuardFunction, createRegex, createRGXClassGuardFunction } from "src/utils";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";
import { cloneRGXToken } from "src/clone";

function parseRepeatJSONArgs(args: RGXJSONValue[]): [RGXJSONToken, number?, (number | null)?, boolean?] | string {
    if (args.length < 1 || args.length > 4) return "Expected between 1 and 4 arguments (token, min, max, lazy).";

    const [token, min, max, lazy] = args;
    if (!isRGXJSONToken(token, false)) return "Argument 0 (token) must be a JSON token.";
    if (min !== undefined && typeof min !== "number") return "Argument 1 (min) must be a number, if present.";
    if (max !== undefined && max !== null && typeof max !== "number") return "Argument 2 (max) must be a number or null, if present.";
    if (lazy !== undefined && typeof lazy !== "boolean") return "Argument 3 (lazy) must be a boolean, if present.";
    return [token, min, max, lazy];
}

// Tokens already warned about, so each token is only warned about once even though it may be repeated many times.
const warnedNonConsumingTokens = new WeakSet<object>();

// Repeating a token explicitly marked as repeatable is allowed even if it consumes no characters, since it does no harm,
// but it is almost certainly a mistake.
function warnIfRepeatingNonConsuming(value: RGXToken) {
    if (!isRGXToken(value, "convertible") || warnedNonConsumingTokens.has(value)) return;

    // JSON class tokens become class tokens, which may be marked as repeatable.
    const token = isRGXJSONObjectToken(value, false) ? rgxTokenFromJSON(value) : value;
    if (!isRGXConvertibleToken(token, false) || token.rgxIsRepeatable !== true || !isNonConsumingRGXToken(token)) return;

    warnedNonConsumingTokens.add(value);
    const name = RGXClassToken.check(token) ? `${token.constructor.name} token` : "convertible token";
    console.warn(`RGX: Repeating a ${name} that is marked as repeatable (rgxIsRepeatable: true) but consumes no characters, so repeating it has no effect.`);
}

export class RGXRepeatToken extends RGXClassToken {
    _token: RGXToken;
    _min: number;
    _max: number | null = null;
    lazy: boolean = false;

    static check = createRGXClassGuardFunction(RGXRepeatToken);
    static assert = createAssertRGXClassGuardFunction(RGXRepeatToken);

    get min() {
        return this._min;
    }

    set min(value: number) {
        assertInRange(value, { min: 0, max: this.max}, "min cannot be negative and cannot be greater than max");
        this._min = Math.floor(value);
    }

    get max() {
        return this._max;
    }

    set max(value: number | null) {
        if (value === null) {
            this._max = null;
            return;
        }

        assertInRange(value, { min: Math.max(0, this.min)}, "max cannot be negative and cannot be less than min");
        this._max = Math.floor(value);
    }

    get token(): RGXToken {
        return this._token;
    }

    set token(value: RGXToken) {
        if (isRGXToken(value, "interpolation")) {
            throw new RGXNotSupportedError("Repeating interpolation tokens", "Interpolation tokens are source fragments, which can't be repeated as a unit.");
        }

        if (!isRGXToken(value, "repeatable")) {
            const reason = "The token was marked as non-repeatable, or was detected as consuming no characters.";
            if (isRGXToken(value, "class")) {
                throw new RGXNotSupportedError(`Repeating ${value.constructor.name} tokens`, reason);
            } else if (isRGXToken(value, "convertible")) {
                throw new RGXNotSupportedError("Repeating non-repeatable convertible tokens", reason);
            } else {
                // Literal tokens and arrays have no preference, so they can only be detected.
                const type = isRGXToken(value, "literal") ? "literal tokens" : "arrays";
                throw new RGXNotSupportedError(`Repeating ${type} that consume no characters`, "The token was detected as consuming no characters.");
            }
        }

        warnIfRepeatingNonConsuming(value);
        this._token = value;
    }

    // By default, repeat a fixed number of times.
    constructor(token: RGXToken, min: number = 1, max: number | null = min, lazy=false) {
        super();
        this.token = token;
        this.min = min;
        this.max = max;
        this.lazy = lazy;
    }

    get repeaterSuffix() {
        const result = (() => {
            if (this.min === 0 && this.max === null) return '*';
            if (this.min === 1 && this.max === null) return '+';
            if (this.min === 0 && this.max === 1) return '?';
            if (this.max === null) return `{${this.min},}`;

            if (this.min === this.max) {
                // No need for a repeater suffix if we're repeating exactly once.
                if (this.min === 1) return '';
                return `{${this.min}}`;
            }

            return `{${this.min},${this.max}}`;
        })();

        if (this.lazy && result.length > 0 && result !== "?") return result + '?';
        else return result;
    }

    toRgx(): RGXToken {
        // No-op if we're repeating zero times.
        if (this.min === 0 && this.max === 0) return null;
        
        // The quantifier must apply to the whole token, so normalize it to a singleton before adding it. This adds a
        // group when the token isn't a singleton, and removes groups that only wrap one.
        const resolvedSource = toSingletonRegexSource(resolveRGXToken(this.token));
        return createRegex(`${resolvedSource}${this.repeaterSuffix}`);
    }

    clone(depth: CloneDepth="max") {
        if (depth === 0) return this;
        return new RGXRepeatToken(cloneRGXToken(this.token, depthDecrement(depth, 1)), this.min, this.max, this.lazy);
    }

    static fromJSON(json: RGXJSONClassToken): RGXRepeatToken {
        const [token, min, max, lazy] = rgxJSONClassArgs(json, "RGXRepeatToken", parseRepeatJSONArgs);
        const resolvedMin = min ?? 1;
        return new RGXRepeatToken(rgxTokenFromJSON(token), resolvedMin, max === undefined ? resolvedMin : max, lazy ?? false);
    }

    toJSON(): RGXJSONClassToken {
        return createRGXJSONClassToken("RGXRepeatToken", [rgxTokenToJSON(this.token), this.min, this.max, this.lazy]);
    }
}

export const rgxRepeat = createConstructFunction(RGXRepeatToken);