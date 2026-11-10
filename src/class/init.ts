import { RGXToken } from "src/types";
import { RGXClassToken } from "./base";
import { expandRgxUnionTokens, RGXClassUnionToken } from "./union";
import { RGXGroupToken, RGXGroupTokenArgs } from "./group";
import { RGXRepeatOptions, RGXRepeatToken } from "./repeat";
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

// The lazy argument of repeat() and optional() can be an options object instead.
function normalizeRGXRepeatOptions(lazy: boolean | RGXRepeatOptions, possessive: boolean): Required<RGXRepeatOptions> {
    const options = typeof lazy === "object" ? lazy : { lazy, possessive };
    return {
        lazy: options.lazy ?? false,
        possessive: options.possessive ?? false,
        perOption: options.perOption ?? false,
        inner: options.inner ?? false
    };
}

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
    ): RGXRepeatToken | RGXClassUnionToken | RGXGroupToken {
        if (RGXLookaroundToken.check(this)) throw new RGXNotSupportedError("RGXLookaroundToken.repeat()", "Lookaround tokens cannot be repeated or made optional.");
        const options = normalizeRGXRepeatOptions(lazy, possessive);

        // An empty union has no options to repeat, so it is repeated as a whole.
        if (options.perOption && RGXClassUnionToken.check(this) && this.tokens.length > 0) {
            return new RGXClassUnionToken(this.tokens.map(token =>
                // Class tokens get the same options, so a named group among the options can have its contents repeated.
                RGXClassToken.check(token) ? token.repeat(min, max, options) : new RGXRepeatToken(token, min, max, options.lazy, options.possessive)
            ));
        }

        if (options.inner && RGXGroupToken.check(this) && this.capturing) {
            // The contents are repeated in a non-capturing group, which is left out of the source when it isn't
            // needed. An atomic group stays atomic for each repetition, as it was when the group itself was repeated.
            const contents = new RGXGroupToken({ capturing: false, atomic: this.isAtomic }, this.tokens);
            const copy = this.clone(1);
            copy.isAtomic = false;
            copy.tokens = [new RGXRepeatToken(contents, min, max, options.lazy, options.possessive)];
            return copy;
        }

        return new RGXRepeatToken(this, min, max, options.lazy, options.possessive);
    } as RGXClassToken["repeat"];

    RGXClassToken.prototype.optional = function (
        this: RGXClassToken, lazy: boolean | RGXRepeatOptions = false, possessive: boolean = false
    ): RGXRepeatToken | RGXClassUnionToken | RGXGroupToken {
        const options = normalizeRGXRepeatOptions(lazy, possessive);

        // A possessive repeat is atomic as a whole, so making it optional changes more than its minimum.
        if (RGXRepeatToken.check(this) && !this.possessive && !options.possessive) {
            // Retun the self if already optional.
            if (this.min === 0) return this;
            // Simply set min to 0 if it's currently 1,
            // but not if it's any other number, since
            // "either 0 or > 0" is not the same as "either 0 or >= n" for n > 1,
            // but they are equivalent for n = 1, assuming n is an integer.
            else if (this.min === 1) return new RGXRepeatToken(this.token, 0, this.max, options.lazy);
        }
        return this.repeat(0, 1, options);
    } as RGXClassToken["optional"];

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