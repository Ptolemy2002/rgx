import { RGXClassToken } from "./base";
import { RGXJSONClassToken, RGXJSONNativeToken, RGXJSONValue, RGXNativeToken } from "src/types";
import { createRGXJSONClassToken, rgxJSONClassArgs, rgxTokenToJSON } from "src/json";
import { assertRGXNativeToken, isRGXJSONNativeToken, isRGXNoOpToken } from "src/typeGuards";
import { CloneDepth } from "@ptolemy2002/immutability-utils";
import { createConstructFunction, createRegexPiece } from "src/internal";
import { exactRegex } from "src/resolve";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";

function parseExactJSONArgs(args: RGXJSONValue[]): [RGXJSONNativeToken] | string {
    if (args.length !== 1) return "Expected exactly 1 argument (value).";
    const [value] = args;
    if (!isRGXJSONNativeToken(value)) return "Argument 0 (value) must be a string, number, boolean, or null.";
    return [value];
}

// A native token whose text is matched exactly as written, whatever flags are around it: the i flag and custom flags
// (such as "a") don't change what it matches. A native token on its own, in contrast, is affected by them.
export class RGXExactToken extends RGXClassToken {
    _value: RGXNativeToken;

    static check = createRGXClassGuardFunction(RGXExactToken);
    static assert = createAssertRGXClassGuardFunction(RGXExactToken);

    get value() {
        return this._value;
    }

    set value(value: RGXNativeToken) {
        assertRGXNativeToken(value);
        this._value = value;
    }

    // The text matched, which is the value as a string, the same as a native token resolves to. No-op tokens have none.
    get text(): string {
        return isRGXNoOpToken(this.value) ? "" : String(this.value);
    }

    constructor(value: RGXNativeToken) {
        super();
        this.value = value;
    }

    toRgx(currentFlags: string = '') {
        return createRegexPiece(exactRegex(this.text), currentFlags);
    }

    clone(depth: CloneDepth = "max") {
        if (depth === 0) return this;
        return new RGXExactToken(this.value);
    }

    static fromJSON(json: RGXJSONClassToken): RGXExactToken {
        const [value] = rgxJSONClassArgs(json, "RGXExactToken", parseExactJSONArgs);
        return new RGXExactToken(value);
    }

    toJSON(): RGXJSONClassToken {
        // Stored the way rgxTokenToJSON stores a native token, so undefined becomes null and non-finite numbers throw.
        return createRGXJSONClassToken("RGXExactToken", [rgxTokenToJSON(this.value) as RGXJSONNativeToken]);
    }
}

export const rgxExact = createConstructFunction(RGXExactToken);
