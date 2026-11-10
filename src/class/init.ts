import { RGXToken } from "src/types";
import { RGXClassToken } from "./base";
import { expandRgxUnionTokens, RGXClassUnionToken } from "./union";
import { RGXGroupToken, RGXGroupTokenArgs } from "./group";
import { RGXRepeatOptions, RGXRepeatToken } from "./repeat";
import { normalizeRGXRepeatOptions } from "src/internal";
import { RGXLookaroundToken } from "./lookaround";
import { RGXNotSupportedError } from "src/errors";
import { RGXLookaheadToken } from "./lookahead";
import { RGXLookbehindToken } from "./lookbehind";
import { RGXExclusionToken } from "./exclusion";
import { RGXClassWrapperToken } from "./wrapper";
import { RGXSubpatternToken } from "./subpattern";
import { RGXConstantToken } from "./constant";
import { RGXExactToken } from "./exact";
import { RGXListToken } from "./list";
import { hasRGXJSONClass, registerRGXJSONClassToken, RGXJSONBuiltinClassName, RGXJSONClassTokenConstructor } from "src/json";

export const RGX_BUILTIN_JSON_CLASSES: Record<RGXJSONBuiltinClassName, RGXJSONClassTokenConstructor> = {
    RGXClassWrapperToken,
    RGXClassUnionToken,
    RGXGroupToken,
    RGXRepeatToken,
    RGXLookaheadToken,
    RGXLookbehindToken,
    RGXExclusionToken,
    RGXSubpatternToken,
    RGXConstantToken,
    RGXExactToken,
    RGXListToken
};

export function registerBuiltinRGXJSONClasses() {
    for (const [name, constructor] of Object.entries(RGX_BUILTIN_JSON_CLASSES)) {
        // Skip classes that are already registered so this function is safe to call more than once.
        if (!hasRGXJSONClass(name)) registerRGXJSONClassToken(name, constructor);
    }
}

export function rgxClassInit() {
    // Make the built-in class tokens available to rgxTokenFromJSON.
    registerBuiltinRGXJSONClasses();

    // Patch RGXClassToken here, Since classes like RGXClassUnionToken are instances of RGXClassToken
    // themselves. If we tried to import RGXClassUnionToken in base.ts, it would cause a circular dependency.
    
    RGXClassToken.prototype.or = function (this: RGXClassToken, ...others: RGXToken[]): RGXClassUnionToken {
        if (others.length === 0) return new RGXClassUnionToken([this]);

        // Remove any instances of this token itself
        const filteredOthers = expandRgxUnionTokens(...others).filter(token => token !== this);

        if (this instanceof RGXClassUnionToken) {
            return new RGXClassUnionToken([...this.tokens, ...filteredOthers]);
        } else {
            return new RGXClassUnionToken([this, ...filteredOthers]);
        }
    };

    RGXClassToken.prototype.group = function (this: RGXClassToken, args: RGXGroupTokenArgs = {}, ...others: RGXToken[]): RGXGroupToken {
        return new RGXGroupToken(args, [this, ...others]);
    }

    RGXClassToken.prototype.repeat = function (
        this: RGXClassToken, min: number = 1, max: number | null = min, lazy: boolean | RGXRepeatOptions = false, possessive: boolean = false
    ): RGXRepeatToken {
        if (RGXLookaroundToken.check(this)) throw new RGXNotSupportedError("RGXLookaroundToken.repeat()", "Lookaround tokens cannot be repeated or made optional.");
        return new RGXRepeatToken(this, min, max, lazy, possessive);
    };

    RGXClassToken.prototype.optional = function (this: RGXClassToken, lazy: boolean | RGXRepeatOptions = false, possessive: boolean = false): RGXRepeatToken {
        const options = normalizeRGXRepeatOptions(lazy, possessive);

        // A possessive repeat is atomic as a whole, so making it optional changes more than its minimum. Repeating a
        // group's contents inside it changes what the group captures when nothing matches, so it is left alone too.
        if (RGXRepeatToken.check(this) && !this.possessive && !options.possessive && !this.inner) {
            // Retun the self if already optional.
            if (this.min === 0) return this;
            // Simply set min to 0 if it's currently 1,
            // but not if it's any other number, since
            // "either 0 or > 0" is not the same as "either 0 or >= n" for n > 1,
            // but they are equivalent for n = 1, assuming n is an integer. Repeating each option of a union stays
            // equivalent the same way.
            else if (this.min === 1) return new RGXRepeatToken(this.token, 0, this.max, { lazy: options.lazy, perOption: this.perOption });
        }
        return this.repeat(0, 1, options);
    };

    RGXClassToken.prototype.atomic = function (this: RGXClassToken): RGXGroupToken {
        // A group is made atomic itself, keeping its name and flags.
        if (RGXGroupToken.check(this)) {
            if (this.isAtomic) return this;
            const copy = this.clone(1);
            copy.isAtomic = true;
            return copy;
        }
        return new RGXGroupToken({ capturing: false, atomic: true }, [this]);
    }

    RGXClassToken.prototype.asLookahead = function (this: RGXClassToken, positive: boolean = true): RGXLookaheadToken {
        if (RGXLookaheadToken.check(this)) return this;
        if (RGXLookbehindToken.check(this)) return this.reverse();
        return new RGXLookaheadToken([this], positive);
    }

    RGXClassToken.prototype.asLookbehind = function (this: RGXClassToken, positive: boolean = true): RGXLookbehindToken {
        if (RGXLookbehindToken.check(this)) return this;
        if (RGXLookaheadToken.check(this)) return this.reverse();
        return new RGXLookbehindToken([this], positive);
    }

    RGXClassToken.prototype.subtract = function (
        this: RGXClassToken,
        exclusionId: string,
        exclusions: RGXToken[] = [],
        terminal: RGXToken = null
    ): RGXExclusionToken {
        return new RGXExclusionToken(exclusionId, this, exclusions, terminal);
    }
}