import { RGXClassToken } from "./base";
import { assertValidIdentifier } from "src/typeGuards";
import { assertInRange } from "src/errors";
import { CloneDepth } from "@ptolemy2002/immutability-utils";
import { createAssertClassGuardFunction, createClassGuardFunction, createConstructFunction } from "src/internal";

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

    static check = createClassGuardFunction(RGXSubpatternToken);
    static assert = createAssertClassGuardFunction(RGXSubpatternToken);

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