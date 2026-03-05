import { RGXClassToken } from "./base";
import { assertValidIdentifier } from "src/typeGuards";
import { assertInRange } from "src/errors";
import { CloneDepth } from "@ptolemy2002/immutability-utils";
import { createConstructFunction } from "src/internal";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";

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
            return new RegExp(`\\k<${this.pattern}>`);
        } else {
            return new RegExp(`\\${this.pattern}`);
        }
    }

    clone(depth: CloneDepth = "max") {
        if (depth === 0) return this;
        return new RGXSubpatternToken(this.pattern);
    }
}

export const rgxSubpattern = createConstructFunction(RGXSubpatternToken);