import { RGXInsertionContext, RGXJSONClassToken, RGXJSONToken, RGXJSONValue, RGXToken } from "src/types";
import { createRGXJSONClassToken, rgxJSONClassArgs, rgxTokenFromJSON, rgxTokenToJSON } from "src/json";
import { RGXClassToken } from "./base";
import { isRGXConvertibleToken, isRGXJSONObjectToken, isRGXJSONToken, isRGXToken } from "src/typeGuards";
import { assertInRange, RGXNotSupportedError } from "src/errors";
import { resolveRGXToken } from "src/resolve";
import { atomicRegexSource, createConstructFunction, normalizeRGXRepeatOptions, createRegexPiece, isNonConsumingRGXToken, scanOptionsFromFlags, toSingletonRegexSource } from "src/internal";
import { rejectRGXAtomicInLookbehind } from "./atomic";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";
import { cloneRGXToken } from "src/clone";
import { expandRgxUnionTokens, RGXClassUnionToken } from "./union";
import { RGXGroupToken } from "./group";

// Options for RGXRepeatToken, given in place of the lazy and possessive flags.
export type RGXRepeatOptions = {
    lazy?: boolean;
    possessive?: boolean;
    // On a union (a union token or an array), repeat each of its options instead of the union as a whole.
    perOption?: boolean;
    // On a capturing group, repeat its contents inside the group instead of the group itself.
    inner?: boolean;
};

const REPEAT_JSON_FLAG_NAMES = ["lazy", "possessive", "perOption", "inner"] as const;

function parseRepeatJSONArgs(args: RGXJSONValue[]): [RGXJSONToken, number?, (number | null)?, ...(boolean | undefined)[]] | string {
    if (args.length < 1 || args.length > 7) return "Expected between 1 and 7 arguments (token, min, max, lazy, possessive, perOption, inner).";

    const [token, min, max, ...flags] = args;
    if (!isRGXJSONToken(token, false)) return "Argument 0 (token) must be a JSON token.";
    if (min !== undefined && typeof min !== "number") return "Argument 1 (min) must be a number, if present.";
    if (max !== undefined && max !== null && typeof max !== "number") return "Argument 2 (max) must be a number or null, if present.";
    for (const [i, flag] of flags.entries()) {
        if (flag !== undefined && typeof flag !== "boolean") return `Argument ${i + 3} (${REPEAT_JSON_FLAG_NAMES[i]}) must be a boolean, if present.`;
    }
    return [token, min, max, ...flags as (boolean | undefined)[]];
}

// Tokens already warned about, so each token is only warned about once even though it may be repeated many times.
const warnedNonConsumingTokens = new WeakSet<object>();

// Repeating a token explicitly marked as repeatable is allowed even if it consumes no characters, since it does no harm,
// but it is almost certainly a mistake.
function warnIfRepeatingNonConsuming(value: RGXToken) {
    // The value was already checked by the setter, so it only has to be an object to have been warned about.
    if (typeof value !== "object" || value === null || warnedNonConsumingTokens.has(value)) return;

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
    // Whether the repetition is atomic: once it has matched, it isn't backtracked into to give characters back (or, if
    // it is also lazy, to take more).
    possessive: boolean = false;
    _perOption: boolean = false;
    // Whether a capturing group's contents are repeated inside it, so it captures every repetition instead of only the
    // last one. Other tokens are repeated as a whole.
    inner: boolean = false;

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

        // Each option is repeated on its own, so each one has to be repeatable.
        if (this.perOption) this.optionRepeats(value);
        warnIfRepeatingNonConsuming(value);
        this._token = value;
    }

    // Whether each option of a union (a union token or an array) is repeated instead of the union as a whole, so every
    // repetition matches the same option. Other tokens are repeated as a whole.
    get perOption() {
        return this._perOption;
    }

    set perOption(value: boolean) {
        if (value) this.optionRepeats(this.token);
        this._perOption = value;
    }

    // By default, repeat a fixed number of times. The lazy argument can be an options object instead, in which case the
    // possessive argument is ignored.
    constructor(token: RGXToken, min: number = 1, max: number | null = min, lazy: boolean | RGXRepeatOptions = false, possessive: boolean = false) {
        super();
        const options = normalizeRGXRepeatOptions(lazy, possessive);
        this.token = token;
        this.min = min;
        this.max = max;
        this.lazy = options.lazy;
        this.possessive = options.possessive;
        this.perOption = options.perOption;
        this.inner = options.inner;
    }

    get options(): Required<RGXRepeatOptions> {
        return { lazy: this.lazy, possessive: this.possessive, perOption: this.perOption, inner: this.inner };
    }

    // The repeat of each option of a union, with the same options, so options that are unions or capturing groups are
    // handled the same way. Returns null for tokens that aren't unions, and for empty unions, which have no options to
    // repeat. Throws if an option can't be repeated.
    optionRepeats(token: RGXToken = this.token): RGXRepeatToken[] | null {
        if (!Array.isArray(token) && !RGXClassUnionToken.check(token)) return null;

        const options = expandRgxUnionTokens(token);
        if (options.length === 0) return null;
        return options.map(option => new RGXRepeatToken(option, this.min, this.max, this.options));
    }

    rgxAcceptInsertion(context: RGXInsertionContext): string | boolean {
        // Possessive repeats are emulated with an atomic group.
        return this.possessive ? rejectRGXAtomicInLookbehind(context) : true;
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

        if (this.lazy && result.length > 0) return result + '?';
        else return result;
    }

    toRgx(currentFlags: string = ''): RGXToken {
        // No-op if we're repeating zero times.
        if (this.min === 0 && this.max === 0) return null;

        if (this.perOption) {
            const repeats = this.optionRepeats();
            if (repeats !== null) return new RGXClassUnionToken(repeats).toRgx(currentFlags);
        }

        if (this.inner && RGXGroupToken.check(this.token) && this.token.capturing) {
            // The contents are repeated in a non-capturing group, which is left out of the source when it isn't
            // needed. An atomic group stays atomic for each repetition, as it was when the group itself was repeated.
            const contents = new RGXGroupToken({ capturing: false, atomic: this.token.isAtomic }, this.token.tokens);
            const copy = this.token.clone(1);
            copy.isAtomic = false;
            copy.tokens = [new RGXRepeatToken(contents, this.min, this.max, this.lazy, this.possessive)];
            return createRegexPiece(resolveRGXToken(copy, { currentFlags }), currentFlags);
        }

        // The quantifier must apply to the whole token, so normalize it to a singleton before adding it. This adds a
        // group when the token isn't a singleton, and removes groups that only wrap one.
        const resolvedSource = toSingletonRegexSource(resolveRGXToken(this.token, { currentFlags }), scanOptionsFromFlags(currentFlags));
        const source = `${resolvedSource}${this.repeaterSuffix}`;
        return createRegexPiece(this.possessive ? atomicRegexSource(source) : source, currentFlags);
    }

    clone(depth: CloneDepth="max") {
        if (depth === 0) return this;
        return new RGXRepeatToken(cloneRGXToken(this.token, depthDecrement(depth, 1)), this.min, this.max, this.options);
    }

    static fromJSON(json: RGXJSONClassToken): RGXRepeatToken {
        const [token, min, max, lazy, possessive, perOption, inner] = rgxJSONClassArgs(json, "RGXRepeatToken", parseRepeatJSONArgs);
        const resolvedMin = min ?? 1;
        return new RGXRepeatToken(rgxTokenFromJSON(token), resolvedMin, max === undefined ? resolvedMin : max, { lazy, possessive, perOption, inner });
    }

    toJSON(): RGXJSONClassToken {
        // The flags after lazy are left out while they and the ones after them are false, so JSON from before they
        // existed stays the same.
        const flags = [this.lazy, this.possessive, this.perOption, this.inner];
        while (flags.length > 1 && !flags[flags.length - 1]) flags.pop();
        return createRGXJSONClassToken("RGXRepeatToken", [rgxTokenToJSON(this.token), this.min, this.max, ...flags]);
    }
}

export const rgxRepeat = createConstructFunction(RGXRepeatToken);