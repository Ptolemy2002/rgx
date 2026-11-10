import { RGXConvertibleToken, RGXInsertionContext, RGXJSONClassToken, RGXJSONObjectToken, RGXToken, ValidRegexString } from "src/types";
import { RGXInvalidTokenError, RGXNotImplementedError } from "src/errors";
import { createRGXJSONLiteralToken } from "src/json";
import { removeRedundantRegexGroups } from "src/internal/analyzeRegexSource";
import { withoutRGXInsertionChecks } from "src/internal/insertionContext";
import { resolveFinishedRGXSource } from "src/internal/exactMarkers";
import { resolveRGXToken, ResolveRGXTokenOptions } from "src/resolve";
import { CloneDepth } from "@ptolemy2002/immutability-utils";
import type { RGXClassUnionToken } from "./union";
import type { RGXGroupToken, RGXGroupTokenArgs } from "./group";
import type { RGXRepeatToken, RGXRepeatOptions } from "./repeat";
import type { RGXLookaheadToken } from "./lookahead";
import type { RGXLookbehindToken } from "./lookbehind";
import type { RGXExclusionToken } from "./exclusion";

export abstract class RGXClassToken implements RGXConvertibleToken {
    // currentFlags are the flags in effect where the token is placed, including the flags of enclosing modifier groups.
    abstract toRgx(currentFlags?: string): RGXToken
    abstract clone(depth?: CloneDepth): ThisType<this>;

    // Subclasses that want lossless JSON serialization (i.e. to be part of the JSON class registry) should override
    // toJSON and both static methods below. They are not marked abstract, since subclasses that are not registered
    // remain serializable through the toJSON fallback. The static methods throw RGXNotImplementedError by default.
    // When overridden, toJSON must return a JSON class token whose args, when given to the registered constructor for the
    // class, reconstruct an equivalent token. By default, it falls back to resolving the token into a
    // JSON literal token, the same way plain convertible tokens are handled by rgxTokenToJSON. This is lossy.
    toJSON(): RGXJSONObjectToken {
        // Serializing the token isn't part of building a pattern.
        // Its exact text is compiled, since nothing would mark the source of a JSON literal as having it.
        const source = withoutRGXInsertionChecks(() => resolveFinishedRGXSource(() => resolveRGXToken(this, { groupWrap: false })));
        return createRGXJSONLiteralToken(removeRedundantRegexGroups(source, { isolated: true }));
    }

    static fromJSON(json: RGXJSONClassToken): RGXClassToken {
        throw new RGXNotImplementedError('RGXClassToken.fromJSON(json)', 'subclasses must override this static method in order to be registered in the JSON class registry.');
    }

    rgxAcceptInsertion(context: RGXInsertionContext): string | boolean {
        return true;
    }

    // The createClassGuard function only accepts non-abstract classes, so we 
    // manually define the guard and assertion functions for RGXClassToken here.
    static check = (value: unknown): value is RGXClassToken => value instanceof RGXClassToken;
    static assert = (value: unknown): asserts value is RGXClassToken => {
        if (!(value instanceof RGXClassToken)) {
            throw new RGXInvalidTokenError("Invalid token type", { type: "custom", values: ["instance of RGXClassToken"] }, value);
        }
    };

    // Unset by default, so the token is only non-repeatable if it is detected as consuming no characters.
    // Subclasses can override this to set an explicit preference.
    get rgxIsRepeatable(): boolean | undefined {
        return undefined;
    }

    or(...others: RGXToken[]): RGXClassUnionToken {
        throw new RGXNotImplementedError('RGXClassToken.or(...others)', 'call rgxClassInit() first.');
    }

    group(args: RGXGroupTokenArgs = {}, ...others: RGXToken[]): RGXGroupToken {
        throw new RGXNotImplementedError('RGXClassToken.group(args)', 'call rgxClassInit() first.');
    }

    // The third argument can be an options object instead of the lazy and possessive flags. Only the perOption and
    // inner options can produce something other than a repeat token.
    repeat(min?: number, max?: number | null, lazy?: boolean, possessive?: boolean): RGXRepeatToken;
    repeat(min: number | undefined, max: number | null | undefined, options: RGXRepeatOptions & { perOption?: false, inner?: false }): RGXRepeatToken;
    repeat(min: number | undefined, max: number | null | undefined, options: RGXRepeatOptions): RGXRepeatToken | RGXClassUnionToken | RGXGroupToken;
    repeat(min: number = 1, max: number | null = min, lazy: boolean | RGXRepeatOptions = false, possessive: boolean = false): RGXRepeatToken | RGXClassUnionToken | RGXGroupToken {
        throw new RGXNotImplementedError('RGXClassToken.repeat(min, max, lazy, possessive)', 'call rgxClassInit() first.');
    }

    optional(lazy?: boolean, possessive?: boolean): RGXRepeatToken;
    optional(options: RGXRepeatOptions & { perOption?: false, inner?: false }): RGXRepeatToken;
    optional(options: RGXRepeatOptions): RGXRepeatToken | RGXClassUnionToken | RGXGroupToken;
    optional(lazy: boolean | RGXRepeatOptions = false, possessive: boolean = false): RGXRepeatToken | RGXClassUnionToken | RGXGroupToken {
        throw new RGXNotImplementedError('RGXClassToken.optional(lazy, possessive)', 'call rgxClassInit() first.');
    }

    atomic(): RGXGroupToken {
        throw new RGXNotImplementedError('RGXClassToken.atomic()', 'call rgxClassInit() first.');
    }

    asLookahead(positive: boolean = true): RGXLookaheadToken {
        throw new RGXNotImplementedError('RGXClassToken.asLookahead(positive)', 'call rgxClassInit() first.');
    }

    asLookbehind(positive: boolean = true): RGXLookbehindToken {
        throw new RGXNotImplementedError('RGXClassToken.asLookbehind(positive)', 'call rgxClassInit() first.');
    }

    subtract(exclusionId: string, exclusions: RGXToken=[], terminal: RGXToken = null): RGXExclusionToken {
        throw new RGXNotImplementedError('RGXClassToken.subtract(exclusionId, exclusions, terminal)', 'call rgxClassInit() first.');
    }

    resolve(options: ResolveRGXTokenOptions={}): ValidRegexString {
        return resolveRGXToken(this, options);
    }
}