import { RGXInvalidPatternTransformerKeyError } from "src/errors";
import { applyRGXPatternTransformersToSource, hasRGXPatternTransformer, listRGXPatternTransformers } from "./register";

// Which transformers to apply: true for every registered one, false for none, a list of ids for those (in registration
// order), or null for the enabled ones.
export type RGXPatternTransformerSelection = readonly string[] | boolean | null;

export function resolveRGXPatternTransformerSelection(selection: RGXPatternTransformerSelection): string[] {
    if (selection === null) return listRGXPatternTransformers(true);
    if (selection === true) return listRGXPatternTransformers();
    if (selection === false) return [];

    for (const id of selection) {
        if (!hasRGXPatternTransformer(id)) throw new RGXInvalidPatternTransformerKeyError("No pattern transformer exists under this id.", id);
    }
    return listRGXPatternTransformers().filter(id => selection.includes(id));
}

// The ids in a selection kept from an earlier pattern that are still registered, so the selection can be applied again.
export function registeredRGXPatternTransformers(ids: readonly string[]): string[] {
    return ids.filter(hasRGXPatternTransformer);
}

// What the library applies to the finished patterns it compiles itself.
export function applyDefaultRGXPatternTransformersToSource(source: string, flags: string = ''): string {
    return applyRGXPatternTransformersToSource(source, flags, listRGXPatternTransformers(true));
}
