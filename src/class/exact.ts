import { RGXClassToken } from "./base";
import { RGXJSONClassToken, RGXJSONValue } from "src/types";
import { createRGXJSONClassToken, rgxJSONClassArgs } from "src/json";
import { RGXInvalidTokenError } from "src/errors";
import { CloneDepth } from "@ptolemy2002/immutability-utils";
import { createConstructFunction, createRegexPiece } from "src/internal";
import { exactRegex } from "src/resolve";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";

function parseExactJSONArgs(args: RGXJSONValue[]): [string] | string {
    if (args.length !== 1) return "Expected exactly 1 argument (text).";
    const [text] = args;
    if (typeof text !== "string") return "Argument 0 (text) must be a string.";
    return [text];
}

// Text that is matched exactly as written, whatever flags are around it: the i flag and custom flags (such as "a") don't
// change what it matches. A native string, in contrast, is affected by them.
export class RGXExactToken extends RGXClassToken {
    _text: string;

    static check = createRGXClassGuardFunction(RGXExactToken);
    static assert = createAssertRGXClassGuardFunction(RGXExactToken);

    get text() {
        return this._text;
    }

    set text(value: string) {
        if (typeof value !== "string") throw new RGXInvalidTokenError("Exact text must be a string", { type: "custom", values: ["string"] }, value);
        this._text = value;
    }

    constructor(text: string) {
        super();
        this.text = text;
    }

    toRgx(currentFlags: string = '') {
        return createRegexPiece(exactRegex(this.text), currentFlags);
    }

    clone(depth: CloneDepth = "max") {
        if (depth === 0) return this;
        return new RGXExactToken(this.text);
    }

    static fromJSON(json: RGXJSONClassToken): RGXExactToken {
        const [text] = rgxJSONClassArgs(json, "RGXExactToken", parseExactJSONArgs);
        return new RGXExactToken(text);
    }

    toJSON(): RGXJSONClassToken {
        return createRGXJSONClassToken("RGXExactToken", [this.text]);
    }
}

export const rgxExact = createConstructFunction(RGXExactToken);
