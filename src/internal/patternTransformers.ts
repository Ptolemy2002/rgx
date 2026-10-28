import { fixModifierGroupAlternatives, fixModifierGroupLeaks } from "./modifierGroupWorkarounds";

// A rewrite applied to every finished pattern the library compiles, to work around known regex engine bugs. It
// receives the pattern's source and vanilla flags, and must return a source that matches the same strings with the
// same captures as intended, reading it the way the specification does. Transformers should leave sources they don't
// need to change untouched, and must give the same result when applied to their own output, since a finished pattern
// can be placed into another one and finished again.
export type RGXPatternTransformer = (source: string, flags: string) => string;

// Applied in order.
const patternTransformers: readonly RGXPatternTransformer[] = [
    fixModifierGroupAlternatives,
    fixModifierGroupLeaks,
];

export function applyRGXPatternTransformers(source: string, flags: string = ''): string {
    for (const transformer of patternTransformers) source = transformer(source, flags);
    return source;
}
