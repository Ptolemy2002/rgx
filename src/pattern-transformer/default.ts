import { RGXInvalidPatternTransformerKeyError } from "src/errors";
import {
    applyRGXPatternTransformersToSource, getRGXPatternTransformersEnabled, hasRGXPatternTransformer, listRGXPatternTransformers
} from "./register";

// Which transformers to apply: true for every registered one, false for none, a list of ids for those (in registration
// order), or null for the default (every registered one, unless they are disabled by default).
export type RGXPatternTransformerSelection = readonly string[] | boolean | null;

export function resolveRGXPatternTransformerSelection(selection: RGXPatternTransformerSelection): string[] {
    if (selection === null) selection = getRGXPatternTransformersEnabled();
    if (selection === true) return listRGXPatternTransformers();
    if (selection === false) return [];

    for (const id of selection) {
        if (!hasRGXPatternTransformer(id)) throw new RGXInvalidPatternTransformerKeyError("No pattern transformer exists under this id.", id);
    }
    return listRGXPatternTransformers().filter(id => selection.includes(id));
}

// What the library applies to the finished patterns it compiles itself.
export function applyDefaultRGXPatternTransformersToSource(source: string, flags: string = ''): string {
    if (!getRGXPatternTransformersEnabled()) return source;
    return applyRGXPatternTransformersToSource(source, flags);
}
