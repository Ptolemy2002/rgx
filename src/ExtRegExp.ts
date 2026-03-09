import { RGXFlagTransformerConflictError, RGXInvalidFlagTransformerKeyError, RGXInvalidRegexFlagsError, RGXInvalidRegexStringError, RGXInvalidVanillaRegexFlagsError, RGXNotDirectRegExpError } from "./errors";
import { createConstructFunction } from "./internal";
import { isValidVanillaRegexFlags } from "./typeGuards";
import { ValidRegexFlags } from "./types";
import { createRegex } from "./utils";

export type RegExpFlagTransformer = (exp: RegExp) => [string, string];
const flagTransformers: Record<string, RegExpFlagTransformer> = {};

export class ExtRegExp extends RegExp {
    private extFlags: string;

    constructor(pattern: string | RegExp, flags='') {
        assertValidRegexFlags(flags);

        const vanillaFlags = extractVanillaRegexFlags(flags);
        const customFlags = extractCustomRegexFlags(flags);

        const source = pattern instanceof RegExp ? pattern.source : pattern;
        const alreadyAppliedFlags = pattern instanceof RegExp ? pattern.flags : '';

        const { source: transformedSource, flags: transformedFlags } = applyFlagTransformers(createRegex(source, vanillaFlags), customFlags, alreadyAppliedFlags);
        super(transformedSource, transformedFlags);
        this.extFlags = customFlags;
    }

    get flags(): string {
        return super.flags + this.extFlags;
    }

    // Ensure that methods like .exec(), split(), etc. return instances
    // of ExtRegExp rather than plain RegExp (preserves custom flags)
    static get [Symbol.species](): RegExpConstructor {
        return ExtRegExp as unknown as RegExpConstructor;
    }
}

export function isFlagKeyAvailable(flags: string): boolean {
    if (isValidVanillaRegexFlags(flags)) return false;

    for (const flag in flagTransformers) {
        if (flags.includes(flag)) return false;
    }
    
    return true;
}

export function registerFlagTransformer(key: string, transformer: RegExpFlagTransformer): void {
    if (key.length !== 1) throw new RGXInvalidFlagTransformerKeyError("Flag key must be a single character.", key);
    if (isValidVanillaRegexFlags(key)) throw new RGXFlagTransformerConflictError("Transformer key conflicts with a vanilla regex flag.", key);
    if (!isFlagKeyAvailable(key)) throw new RGXFlagTransformerConflictError("Transformer already exists under this key.", key);
    flagTransformers[key] = transformer;
}

export function unregisterFlagTransformer(key: string): void {
    delete flagTransformers[key];
}

export function applyFlagTransformers(regex: RegExp, flags: string, alreadyAppliedFlags: string = ''): RegExp {
    if (Object.getPrototypeOf(regex) !== RegExp.prototype) {
        throw new RGXNotDirectRegExpError("Cannot apply flag transformers to non-direct RegExp instances", regex.constructor.name);
    }

    for (const flag in flagTransformers) {
        if (flags.includes(flag) && !alreadyAppliedFlags.includes(flag)) {
            const [newSource, newFlags] = flagTransformers[flag]!(regex);
            try {
                if (isValidVanillaRegexFlags(newFlags)) {
                    regex = new RegExp(newSource, newFlags);
                } else {
                    throw new RGXInvalidVanillaRegexFlagsError(`Flag transformer for flag "${flag}" produced invalid vanilla regex flags.`, newFlags);
                }
            } catch (e: unknown) {
                if (e instanceof SyntaxError) {
                    throw new RGXInvalidRegexStringError(`Flag transformer for flag "${flag}" produced an invalid regex.`, newSource, e);
                }

                // This is ignored because I don't know what kind of
                // unexpected errors might happen.
                /* istanbul ignore next */
                throw e;
            }

            alreadyAppliedFlags += flag;
        }
    }
    return regex;
}

export function extractCustomRegexFlags(flags: string): string {
    let customFlags = '';
    for (const flag in flagTransformers) {
        if (flags.includes(flag)) {
            customFlags += flag;
        }
    }
    return customFlags;
}

export function extractVanillaRegexFlags(flags: string): string {
    for (const flag in flagTransformers) {
        flags = flags.replaceAll(flag, '');
    }

    return flags;
}

export function isValidRegexFlags(flags: string): flags is ValidRegexFlags {
    // Remove all instances of registered flag transformers from the flags string, then
    // check if the remaining flags are valid vanilla regex flags.
    flags = extractVanillaRegexFlags(flags);
    return isValidVanillaRegexFlags(flags);
}

export function assertValidRegexFlags(flags: string): asserts flags is ValidRegexFlags {
    if (!isValidRegexFlags(flags)) {
        throw new RGXInvalidRegexFlagsError("Invalid regex flags", flags);
    }
}

export const extRegExp = createConstructFunction(ExtRegExp);