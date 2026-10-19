import { RGXClassToken } from "./base";
import { RGXJSONClassToken, RGXJSONValue } from "src/types";
import { createRGXJSONClassToken, rgxJSONClassArgs } from "src/json";
import { assertValidIdentifier } from "src/typeGuards";
import { assertInRange } from "src/errors";
import { CloneDepth } from "@ptolemy2002/immutability-utils";
import { createConstructFunction, createRegexPiece, recordRGXReference } from "src/internal";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";

function parseSubpatternJSONArgs(args: RGXJSONValue[]): [string | number] | string {
    if (args.length !== 1) return "Expected exactly 1 argument (pattern).";
    const [pattern] = args;
    if (typeof pattern !== "string" && typeof pattern !== "number") return "Argument 0 (pattern) must be a string or number.";
    return [pattern];
}

export class RGXSubpatternToken extends RGXClassToken {
    _pattern: string | number;

    get pattern() {
        return this._pattern;
    }

    set pattern(value: string | number) {
        if (typeof value === "string") {
            assertValidIdentifier(value);
            this._pattern = value;
        } else {
            assertInRange(value, { min: 1 }, "Subpattern group numbers must be positive integers (groups are 1-indexed).");
            this._pattern = Math.floor(value);
        }
    }

    static check = createRGXClassGuardFunction(RGXSubpatternToken);
    static assert = createAssertRGXClassGuardFunction(RGXSubpatternToken);

    constructor(pattern: string | number) {
        super();
        this.pattern = pattern;
    }

    toRgx(currentFlags: string = '') {
        // Recorded so finished patterns can check that the group exists (see assertValidRegexReferences).
        recordRGXReference(this.pattern);
        if (typeof this.pattern === "string") {
            return createRegexPiece(`\\k<${this.pattern}>`, currentFlags);
        } else {
            return createRegexPiece(`\\${this.pattern}`, currentFlags);
        }
    }

    clone(depth: CloneDepth = "max") {
        if (depth === 0) return this;
        return new RGXSubpatternToken(this.pattern);
    }

    static fromJSON(json: RGXJSONClassToken): RGXSubpatternToken {
        const [pattern] = rgxJSONClassArgs(json, "RGXSubpatternToken", parseSubpatternJSONArgs);
        return new RGXSubpatternToken(pattern);
    }

    toJSON(): RGXJSONClassToken {
        return createRGXJSONClassToken("RGXSubpatternToken", [this.pattern]);
    }
}

export const rgxSubpattern = createConstructFunction(RGXSubpatternToken);