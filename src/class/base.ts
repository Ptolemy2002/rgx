import { RGXToken, ValidRegexString } from "src/types";
import { RGXTokenCollectionInput } from "src/collection";
import { RGXInvalidTokenError, RGXNotImplementedError } from "src/errors";
import { resolveRGXToken } from "src/resolve";
import type { RGXClassUnionToken } from "./union";
import type { RGXGroupToken, RGXGroupTokenArgs } from "./group";
import type { RGXRepeatToken } from "./repeat";

export abstract class RGXClassToken {
    abstract toRgx(): RGXToken

    // The createClassGuard function only accepts non-abstract classes, so we 
    // manually define the guard and assertion functions for RGXClassToken here.
    static check = (value: unknown): value is RGXClassToken => value instanceof RGXClassToken;
    static assert = (value: unknown): asserts value is RGXClassToken => {
        if (!(value instanceof RGXClassToken)) {
            throw new RGXInvalidTokenError("Invalid token type", { type: "custom", values: ["instance of RGXClassToken"] }, value);
        }
    };

    get isGroup() {
        return false;
    }

    get rgxGroupWrap() {
        return true;
    }

    or(...others: RGXTokenCollectionInput[]): RGXClassUnionToken {
        throw new RGXNotImplementedError('RGXClassToken.or(...others)', 'call rgxClassInit() first.')
    }

    group(args: RGXGroupTokenArgs = {}): RGXGroupToken {
        throw new RGXNotImplementedError('RGXClassToken.group(args)', 'call rgxClassInit() first.')
    }

    repeat(min: number = 1, max: number | null = min): RGXRepeatToken {
        throw new RGXNotImplementedError('RGXClassToken.repeat(min, max)', 'call rgxClassInit() first.')
    }

    optional(): RGXRepeatToken {
        return this.repeat(0, 1);
    }

    resolve(): ValidRegexString {
        return resolveRGXToken(this);
    }
}