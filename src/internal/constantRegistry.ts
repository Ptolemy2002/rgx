import type { RGXClassToken } from "src/class/base";
import { RGXInvalidConstantKeyError } from "src/errors/invalidConstantKey";

// The registry lives here instead of in constants.ts, since constants.ts imports the class tokens, and
// RGXConstantToken needs to look constants up. Importing constants.ts from a class file would be circular.
export const rgxConstantRegistry: Record<string, RGXClassToken> = {};

export function getRGXConstantValue(name: string): RGXClassToken {
    if (!(name in rgxConstantRegistry)) throw new RGXInvalidConstantKeyError("Constant with name not found.", name);
    return rgxConstantRegistry[name]!;
}
