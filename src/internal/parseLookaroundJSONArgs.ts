import { RGXJSONToken, RGXJSONValue } from "src/types";
import { isRGXJSONToken } from "src/typeGuards";

// Shared argument parsing for the lookahead and lookbehind JSON forms.
export function parseLookaroundJSONArgs(args: RGXJSONValue[]): [RGXJSONToken?, boolean?] | string {
    if (args.length > 2) return "Expected at most 2 arguments (tokens, positive).";

    const [tokens, positive] = args;
    if (tokens !== undefined && !isRGXJSONToken(tokens, false)) return "Argument 0 (tokens) must be a JSON token.";
    if (positive !== undefined && typeof positive !== "boolean") return "Argument 1 (positive) must be a boolean, if present.";
    return [tokens, positive];
}
