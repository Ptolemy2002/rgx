import { RGXGroupedToken, RGXToken } from "src/types";
import { RGXClassToken } from "./base";
import { RGXGroupToken } from "./group";
import { isRGXGroupedToken, isRGXToken } from "src/typeGuards";
import { assertInRange } from "src/errors";
import { resolveRGXToken } from "src/resolve";
import { createAssertClassGuardFunction, createClassGuardFunction, createConstructFunction } from "src/internal";

export class RGXRepeatToken extends RGXClassToken {
    _token: RGXGroupedToken;
    _min: number;
    _max: number | null = null;

    static check = createClassGuardFunction(RGXRepeatToken);
    static assert = createAssertClassGuardFunction(RGXRepeatToken);

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

    get token() {
        return this._token;
    }

    set token(value: RGXToken) {
        // Make sure we are always working with a grouped token.
        if (isRGXGroupedToken(value)) this._token = value;
        else this._token = new RGXGroupToken({capturing: false}, value);
    }

    // We don't need to group wrap this token because the repeater has no
    // semantics that would change if there are other tokens to the right.
    get rgxGroupWrap() {
        return false as const;
    }

    // By default, repeat a fixed number of times.
    constructor(token: RGXToken, min: number = 1, max: number | null = min) {
        super();
        this.token = token;
        this.min = min;
        this.max = max;
    }

    get repeaterSuffix() {
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
    }

    toRgx(): RGXToken {
        // No-op if we're repeating zero times.
        if (this.min === 0 && this.max === 0) return null;
        
        const resolvedSource = resolveRGXToken(this.token);
        return new RegExp(`${resolvedSource}${this.repeaterSuffix}`);
    }
}

export const rgxRepeat = createConstructFunction(RGXRepeatToken);