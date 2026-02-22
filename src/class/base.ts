import { RGXToken, ValidRegexString } from "src/types";
import { RGXTokenCollectionInput } from "src/collection";
import { RGXInvalidTokenError, RGXNotImplementedError } from "src/errors";
import { resolveRGXToken } from "src/resolve";
import type { RGXClassUnionToken } from "./union";

export abstract class RGXClassToken {
    abstract toRgx(): RGXToken

    get isGroup() {
        return false;
    }

    or(...others: RGXTokenCollectionInput[]): RGXClassUnionToken {
        throw new RGXNotImplementedError('RGXClassToken.or(...others)', 'call rgxClassInit() first.')
    }

    resolve(): ValidRegexString {
        return resolveRGXToken(this);
    }
}

// The createClassGuard function only accepts non-abstract classes, so we 
// manually define the guard and assertion functions for RGXClassToken here.
export const isRgxClassToken = (value: unknown): value is RGXClassToken => value instanceof RGXClassToken;
export const assertRgxClassToken = (value: unknown): asserts value is RGXClassToken => {
    if (!(value instanceof RGXClassToken)) {
        throw new RGXInvalidTokenError("Invalid token type", { type: "custom", values: ["instance of RGXClassToken"] }, value);
    }
};