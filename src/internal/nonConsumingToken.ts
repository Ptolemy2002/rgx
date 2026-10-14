import { RGXError } from "src/errors";
import { resolveRGXToken } from "src/resolve";
import { RGXToken } from "src/types";
import { isNonConsumingRegexSource } from "./scanRegexSource";

// Whether the token is detected as consuming no characters wherever it matches (see isNonConsumingRegexSource).
// This errs toward false, so tokens that can't be resolved on their own are assumed to consume characters.
export function isNonConsumingRGXToken(token: RGXToken): boolean {
    try {
        return isNonConsumingRegexSource(resolveRGXToken(token));
    } catch (err) {
        if (err instanceof RGXError) return false;

        // This is ignored because I don't know what kind of
        // unexpected errors might happen.
        /* istanbul ignore next */
        throw err;
    }
}
