import { RGXClassToken } from "./base";
import { RGXJSONClassToken, RGXJSONValue } from "src/types";
import { createRGXJSONClassToken, rgxJSONClassArgs } from "src/json";
import { assertValidIdentifier } from "src/typeGuards";
import { assertInRange } from "src/errors";
import { CloneDepth } from "@ptolemy2002/immutability-utils";
import { createConstructFunction } from "src/internal";
import { createAssertRGXClassGuardFunction, createRegex, createRGXClassGuardFunction } from "src/utils";

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

    toRgx() {
        if (typeof this.pattern === "string") {
            return createRegex(`\\k<${this.pattern}>`);
        } else {
            return createRegex(`\\${this.pattern}`);
        }
    }

    clone(depth: CloneDepth = "max") {
        if (depth === 0) return this;
        return new RGXSubpatternToken(this.pattern);
    }

    static validateJSONArgs(args: RGXJSONValue[]): boolean | string {
        if (args.length !== 1) return "Expected exactly 1 argument (pattern).";
        if (typeof args[0] !== "string" && typeof args[0] !== "number") return "Argument 0 (pattern) must be a string or number.";
        return true;
    }

    static fromJSON(json: RGXJSONClassToken): RGXSubpatternToken {
        const [pattern] = rgxJSONClassArgs(json, "RGXSubpatternToken", RGXSubpatternToken.validateJSONArgs) as [string | number];
        return new RGXSubpatternToken(pattern);
    }

    toJSON(): RGXJSONClassToken {
        return createRGXJSONClassToken("RGXSubpatternToken", [this.pattern]);
    }
}

export const rgxSubpattern = createConstructFunction(RGXSubpatternToken);