import { RGXConvertibleToken, RGXToken, ValidRegexString } from "src/types";
import { RGXTokenCollectionInput } from "src/collection";
import { RGXInvalidTokenError, RGXNotImplementedError } from "src/errors";
import { resolveRGXToken } from "src/resolve";
import { CloneDepth } from "@ptolemy2002/immutability-utils";
import type { RGXClassUnionToken } from "./union";
import type { RGXGroupToken, RGXGroupTokenArgs } from "./group";
import type { RGXRepeatToken } from "./repeat";
import type { RGXLookaheadToken } from "./lookahead";
import type { RGXLookbehindToken } from "./lookbehind";

export abstract class RGXClassToken implements RGXConvertibleToken {
    abstract toRgx(): RGXToken
    abstract clone(depth?: CloneDepth): ThisType<this>;

    // The createClassGuard function only accepts non-abstract classes, so we 
    // manually define the guard and assertion functions for RGXClassToken here.
    static check = (value: unknown): value is RGXClassToken => value instanceof RGXClassToken;
    static assert = (value: unknown): asserts value is RGXClassToken => {
        if (!(value instanceof RGXClassToken)) {
            throw new RGXInvalidTokenError("Invalid token type", { type: "custom", values: ["instance of RGXClassToken"] }, value);
        }
    };

    get rgxIsGroup() {
        return false;
    }

    get rgxIsRepeatable() {
        return true;
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

    asLookahead(positive: boolean = true): RGXLookaheadToken {
        throw new RGXNotImplementedError('RGXClassToken.asLookahead(positive)', 'call rgxClassInit() first.');
    }

    asLookbehind(positive: boolean = true): RGXLookbehindToken {
        throw new RGXNotImplementedError('RGXClassToken.asLookbehind(positive)', 'call rgxClassInit() first.');
    }

    resolve(): ValidRegexString {
        return resolveRGXToken(this);
    }
}