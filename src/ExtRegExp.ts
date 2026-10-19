import { RGXFlagTransformerConflictError, RGXInvalidFlagTransformerKeyError, RGXInvalidRegexFlagsError, RGXInvalidRegexStringError, RGXInvalidVanillaRegexFlagsError } from "./errors";
import { createConstructFunction } from "./internal";
import { isValidVanillaRegexFlags } from "./typeGuards";
import { ValidRegexFlags } from "./types";
import { createRegex } from "./utils";

export type RegExpFlagTransformer = (exp: RegExp) => [string, string];
const flagTransformers: Record<string, RegExpFlagTransformer> = {};

export class ExtRegExp extends RegExp {
    private extFlags: string;
    // The pattern before any custom flag transformations, so it can be rebuilt with the same flags.
    readonly originalSource: string;

    constructor(pattern: string | RegExp, flags='') {
        assertValidRegexFlags(flags);

        const vanillaFlags = extractVanillaRegexFlags(flags);
        let customFlags = extractCustomRegexFlags(flags);

        const source = pattern instanceof RegExp ? pattern.source : pattern;
        const alreadyAppliedFlags = pattern instanceof RegExp ? pattern.flags : '';

        const { source: transformedSource, flags: transformedFlags } = applyFlagTransformers(createRegex(source, vanillaFlags), customFlags, alreadyAppliedFlags);
        super(transformedSource, transformedFlags);

        if (pattern instanceof ExtRegExp) {
            // The pattern's custom flags are already applied to the source, so they are still reported, which keeps
            // originalSource and the flags enough to rebuild it.
            for (const flag of extractCustomRegexFlags(pattern.flags)) {
                if (!customFlags.includes(flag)) customFlags += flag;
            }
            this.originalSource = pattern.originalSource;
        } else {
            this.originalSource = source;
        }
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
    // Subclasses such as ExtRegExp can report custom flags in `flags`, and those
    // have already been applied to the source. Mark them as applied and hand
    // transformers a plain RegExp with only the vanilla flags, so a transformer
    // that passes `exp.flags` through doesn't produce invalid vanilla flags.
    if (Object.getPrototypeOf(regex) !== RegExp.prototype) {
        alreadyAppliedFlags += extractCustomRegexFlags(regex.flags);
        regex = createRegex(regex.source, extractVanillaRegexFlags(regex.flags));
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