import { RGXFlagTransformerConflictError, RGXInvalidFlagTransformerKeyError, RGXInvalidRegexFlagsError, RGXInvalidRegexStringError, RGXInvalidVanillaRegexFlagsError } from "./errors";
import { createConstructFunction } from "./internal";
import { compileRGXExactMarkers, findRGXExactMarkers, replaceRGXExactMarkers } from "./internal/exactMarkers";
import { scanOptionsFromFlags } from "./internal/scanRegexSource";
import { renumberRGXAtomicGroups } from "./internal/atomicGroups";
import { finishRGXAtomicGroups, hideRGXAtomicCaptures } from "./internal/finishAtomicGroups";
import { applyRGXPatternTransformersToSource } from "./pattern-transformer/register";
import { registeredRGXPatternTransformers, resolveRGXPatternTransformerSelection, RGXPatternTransformerSelection } from "./pattern-transformer/default";
import { isValidVanillaRegexFlags } from "./typeGuards";
import { ValidRegexFlags } from "./types";

export type RegExpFlagTransformer = (exp: RegExp) => [string, string];
const flagTransformers: Record<string, RegExpFlagTransformer> = {};

export class ExtRegExp extends RegExp {
    private extFlags: string;
    // The pattern before any custom flag transformations, so it can be rebuilt with any flags.
    readonly originalSource: string;
    // The ids of the pattern transformers applied to the source, in the order they were applied.
    readonly patternTransformers: readonly string[];
    // Whether the groups named with the reserved prefix "rgx_exact_" mark exact text (see RGXExactToken), which custom
    // flag transformations leave alone and which is compiled to ignore the i flag.
    readonly exactMarkers: boolean;
    // The source after custom flag transformations, with exact text still marked, so the pattern can be placed in
    // another one without its exact text losing its protection.
    readonly markedSource: string;
    private atomicGroups: readonly number[];
    private atomicGroupNames: readonly string[];

    constructor(pattern: string | RegExp, flags='', patternTransformers: RGXPatternTransformerSelection = null, exactMarkers: boolean | null = null) {
        assertValidRegexFlags(flags);

        const vanillaFlags = extractVanillaRegexFlags(flags);
        const customFlags = extractCustomRegexFlags(flags);

        // An ExtRegExp is rebuilt from its source before any custom flag transformations, so `flags` replaces its
        // custom flags the same way it replaces its vanilla ones.
        const source = pattern instanceof ExtRegExp ? pattern.originalSource : pattern instanceof RegExp ? pattern.source : pattern;

        // An ExtRegExp that is rebuilt keeps marking exact text unless told otherwise.
        exactMarkers ??= pattern instanceof ExtRegExp && pattern.exactMarkers;

        // Flag transformers are given the pattern with the text of each exact marker taken out, so they can't change it,
        // and it is put back afterwards.
        const scanOptions = scanOptionsFromFlags(vanillaFlags);
        const markers = exactMarkers ? findRGXExactMarkers(source, null, scanOptions) : [];
        const contents = new Map(markers.map(marker => [marker.name, source.slice(marker.contentStart, marker.contentEnd)]));
        const hiddenSource = replaceRGXExactMarkers(source, markers, marker => `(?<${marker.name}>)`);

        // Flag transformers are given the pattern as it was built, before its atomic groups are finished, which would
        // change its numeric backreferences. Its atomic groups are only renamed so it compiles.
        const { source: transformed, flags: transformedFlags } = applyFlagTransformers(compileUnfinished(hiddenSource, vanillaFlags), customFlags);
        const transformedScanOptions = scanOptionsFromFlags(transformedFlags);
        const markedSource = contents.size === 0 ? transformed : replaceRGXExactMarkers(
            transformed, findRGXExactMarkers(transformed, new Set(contents.keys()), transformedScanOptions),
            marker => `(?<${marker.name}>${contents.get(marker.name)!})`
        );
        // Exact text is compiled to ignore the i flag, without adding capture groups.
        const transformedSource = exactMarkers ? compileRGXExactMarkers(markedSource, null, transformedScanOptions) : markedSource;
        // Finished patterns go through the pattern transformers, which work around regex engine bugs. An ExtRegExp that
        // is rebuilt keeps its selection, apart from transformers that have been unregistered since.
        if (patternTransformers === null && pattern instanceof ExtRegExp) {
            patternTransformers = registeredRGXPatternTransformers(pattern.patternTransformers);
        }
        const transformerIds = resolveRGXPatternTransformerSelection(patternTransformers);
        // Atomic groups are given their final names, and numeric backreferences their final numbers, since the pattern
        // is finished. The groups are taken back out of each match (see exec).
        const finished = finishRGXAtomicGroups(transformedSource, transformedScanOptions);
        super(applyRGXPatternTransformersToSource(finished.source, transformedFlags, transformerIds), transformedFlags);

        this.originalSource = source;
        this.patternTransformers = transformerIds;
        this.extFlags = customFlags;
        this.exactMarkers = exactMarkers;
        this.markedSource = markedSource;
        this.atomicGroups = finished.atomicGroups;
        this.atomicGroupNames = finished.atomicGroupNames;
    }

    // Atomic groups add capture groups to the compiled pattern, which are taken out of each match, so its numbers,
    // groups and indices are the ones of the pattern as it was built. Other methods (match, replace, split, test and
    // so on) go through this one.
    exec(string: string): RegExpExecArray | null {
        const match = super.exec(string);
        return match === null ? null : hideRGXAtomicCaptures(match, this.atomicGroups, this.atomicGroupNames);
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

function compileUnfinished(source: string, flags: string): RegExp {
    try {
        return new RegExp(renumberRGXAtomicGroups(source, scanOptionsFromFlags(flags)), flags);
    } catch (e: unknown) {
        if (e instanceof SyntaxError) throw new RGXInvalidRegexStringError("Invalid regex string", source, e);

        // This is ignored because I don't know what kind of
        // unexpected errors might happen.
        /* istanbul ignore next */
        throw e;
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
        regex = new RegExp(regex.source, extractVanillaRegexFlags(regex.flags));
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