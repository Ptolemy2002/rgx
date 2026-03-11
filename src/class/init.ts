import { RGXClassToken } from "./base";
import { expandRgxUnionTokens, RGXClassUnionToken } from "./union";
import { RGXGroupToken, RGXGroupTokenArgs } from "./group";
import { RGXTokenCollection, RGXTokenCollectionInput } from "src/collection";
import { RGXRepeatToken } from "./repeat";
import { RGXLookaroundToken } from "./lookaround";
import { RGXNotSupportedError } from "src/errors";
import { RGXLookaheadToken } from "./lookahead";
import { RGXLookbehindToken } from "./lookbehind";

export function rgxClassInit() {
    // Patch RGXClassToken here, Since classes like RGXClassUnionToken are instances of RGXClassToken
    // themselves. If we tried to import RGXClassUnionToken in base.ts, it would cause a circular dependency.
    
    RGXClassToken.prototype.or = function (this: RGXClassToken, ...others: RGXTokenCollectionInput[]): RGXClassUnionToken {
        if (others.length === 0) return new RGXClassUnionToken([this]);

        const expandedOthers: RGXTokenCollection = expandRgxUnionTokens(...others);
        // Remove any instances of this token itself
        const filteredOthers = expandedOthers.tokens.filter(token => token !== this);

        if (this instanceof RGXClassUnionToken) {
            return new RGXClassUnionToken([...this.tokens, ...filteredOthers]);
        } else {
            return new RGXClassUnionToken([this, ...filteredOthers]);
        }
    };

    RGXClassToken.prototype.group = function (this: RGXClassToken, args: RGXGroupTokenArgs = {}, ...others: RGXTokenCollectionInput[]): RGXGroupToken {
        return new RGXGroupToken(args, [this, ...others]);
    }

    RGXClassToken.prototype.repeat = function (this: RGXClassToken, min: number = 1, max: number | null = min, lazy: boolean = false): RGXRepeatToken {
        if (RGXLookaroundToken.check(this)) throw new RGXNotSupportedError("RGXLookaroundToken.repeat()", "Lookaround tokens cannot be repeated or made optional.");
        return new RGXRepeatToken(this, min, max, lazy);
    }

    RGXClassToken.prototype.optional = function (this: RGXClassToken, lazy: boolean = false): RGXRepeatToken {
        if (RGXRepeatToken.check(this)) {
            // Retun the self if already optional.
            if (this.min === 0) return this;
            // Simply set min to 0 if it's currently 1,
            // but not if it's any other number, since
            // "either 0 or > 0" is not the same as "either 0 or >= n" for n > 1,
            // but they are equivalent for n = 1, assuming n is an integer.
            else if (this.min === 1) return new RGXRepeatToken(this.token, 0, this.max, lazy);
        }
        return this.repeat(0, 1, lazy);
    }

    RGXClassToken.prototype.asLookahead = function (this: RGXClassToken, positive: boolean = true): RGXLookaheadToken {
        if (RGXLookaheadToken.check(this)) return this;
        if (RGXLookbehindToken.check(this)) return this.negate();
        return new RGXLookaheadToken([this], positive);
    }

    RGXClassToken.prototype.asLookbehind = function (this: RGXClassToken, positive: boolean = true): RGXLookbehindToken {
        if (RGXLookbehindToken.check(this)) return this;
        if (RGXLookaheadToken.check(this)) return this.negate();
        return new RGXLookbehindToken([this], positive);
    }
}