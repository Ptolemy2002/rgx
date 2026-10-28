import { RGXInvalidPatternTransformerKeyError, RGXInvalidRegexStringError, RGXPatternTransformerConflictError } from "src/errors";
import { modifierGroupAlternativesPatternTransformer, modifierGroupLeaksPatternTransformer } from "./modifierGroup";

// A rewrite applied to every finished pattern the library compiles, usually to work around a regex engine bug. It
// receives the pattern's source and vanilla flags, and returns a source that matches the same strings with the same
// captures. Transformers should leave sources they don't need to change untouched, and must give the same result when
// applied to their own output, since a finished pattern can be placed into another one and finished again.
export type RGXPatternTransformer = (source: string, flags: string) => string;

// Applied in the order they were registered.
const patternTransformers = new Map<string, RGXPatternTransformer>();

export function hasRGXPatternTransformer(id: string): boolean {
    return patternTransformers.has(id);
}

export function listRGXPatternTransformers(): string[] {
    return [...patternTransformers.keys()];
}

export function registerRGXPatternTransformer(id: string, transformer: RGXPatternTransformer): void {
    if (patternTransformers.has(id)) throw new RGXPatternTransformerConflictError("Pattern transformer already exists under this id.", id);
    patternTransformers.set(id, transformer);
}

export function unregisterRGXPatternTransformer(id: string): boolean {
    return patternTransformers.delete(id);
}

export function registerBuiltInRGXPatternTransformers() {
    registerRGXPatternTransformer("modifier-group-alternatives", modifierGroupAlternativesPatternTransformer);
    registerRGXPatternTransformer("modifier-group-leaks", modifierGroupLeaksPatternTransformer);
}

export function unregisterBuiltInRGXPatternTransformers() {
    unregisterRGXPatternTransformer("modifier-group-alternatives");
    unregisterRGXPatternTransformer("modifier-group-leaks");
}

export function applyRGXPatternTransformersToSource(source: string, flags: string = '', ids: readonly string[] | null = null): string {
    for (const id of ids ?? []) {
        if (!patternTransformers.has(id)) throw new RGXInvalidPatternTransformerKeyError("No pattern transformer exists under this id.", id);
    }

    // The registration order is kept even when ids are given in a different order.
    for (const [id, transformer] of patternTransformers) {
        if (ids !== null && !ids.includes(id)) continue;

        const transformed = transformer(source, flags);
        if (transformed === source) continue;

        try {
            new RegExp(transformed, flags);
        } catch (e: unknown) {
            if (e instanceof SyntaxError) {
                throw new RGXInvalidRegexStringError(`Pattern transformer "${id}" produced an invalid regex.`, transformed, e);
            }

            // This is ignored because I don't know what kind of
            // unexpected errors might happen.
            /* istanbul ignore next */
            throw e;
        }

        source = transformed;
    }

    return source;
}

export function applyRGXPatternTransformers(regex: RegExp, ids: readonly string[] | null = null): RegExp {
    // Subclasses such as ExtRegExp can report custom flags in `flags`, which a plain RegExp can't take. The RegExp
    // getter reports only the vanilla flags.
    const flags = Reflect.get(RegExp.prototype, "flags", regex) as string;
    return new RegExp(applyRGXPatternTransformersToSource(regex.source, flags, ids), flags);
}
