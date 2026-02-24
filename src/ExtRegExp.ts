import { RGXFlagTransformerConflictError, RGXInvalidFlagTransformerKeyError, RGXInvalidRegexFlagsError } from "./errors";
import { createConstructFunction } from "./internal";
import { isValidVanillaRegexFlags } from "./typeGuards";
import { ValidRegexFlags } from "./types";

export type RegExpFlagTransformer = (exp: RegExp) => RegExp;
const flagTransformers: Record<string, RegExpFlagTransformer> = {};

export class ExtRegExp extends RegExp {
    private extFlags: string;

    constructor(pattern: string | RegExp, flags='') {
        assertValidRegexFlags(flags);

        const vanillaFlags = extractVanillaRegexFlags(flags);
        const customFlags = extractCustomRegexFlags(flags);

        const source = pattern instanceof RegExp ? pattern.source : pattern;
        const alreadyAppliedFlags = pattern instanceof RegExp ? pattern.flags : '';

        const { source: transformedSource, flags: transformedFlags } = applyFlagTransformers(new RegExp(source, vanillaFlags), customFlags, alreadyAppliedFlags);
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
    for (const flag in flagTransformers) {
        if (flags.includes(flag) && !alreadyAppliedFlags.includes(flag)) {
            regex = flagTransformers[flag]!(regex);
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