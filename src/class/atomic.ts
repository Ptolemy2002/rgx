import { RGXInsertionContext, RGXJSONClassToken, RGXJSONToken, RGXJSONValue, RGXToken } from "src/types";
import { createRGXJSONClassToken, rgxJSONClassArgs, rgxTokenFromJSON, rgxTokenToJSON } from "src/json";
import { RGXClassToken } from "./base";
import { RGXLookbehindToken } from "./lookbehind";
import { RGXError } from "src/errors";
import { isRGXJSONClassToken, isRGXJSONToken } from "src/typeGuards";
import { rgxConcat } from "src/concat";
import { atomicRegexSource, createConstructFunction, createRegexPiece, isNonConsumingRegexSource, withoutRGXInsertionChecks } from "src/internal";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";
import { CloneDepth, depthDecrement, extClone } from "@ptolemy2002/immutability-utils";

function parseAtomicJSONArgs(args: RGXJSONValue[]): [RGXJSONToken?] | string {
    if (args.length > 1) return "Expected at most 1 argument (tokens).";
    const [tokens] = args;
    if (tokens !== undefined && !isRGXJSONToken(tokens, false)) return "Argument 0 (tokens) must be a JSON token.";
    return [tokens];
}

function isLookbehind(token: RGXToken | null): boolean {
    if (RGXLookbehindToken.check(token)) return true;
    // JSON class tokens are placed before they are converted.
    return isRGXJSONClassToken(token, false) && token.class === "RGXLookbehindToken";
}

// Atomic groups are emulated with a capture followed by a backreference to it. Lookbehinds match from right to left,
// so the backreference would be matched before the capture there.
export function rejectRGXAtomicInLookbehind(context: RGXInsertionContext): string | true {
    for (let current: RGXInsertionContext | null = context; current !== null; current = current.parent) {
        if (isLookbehind(current.container)) return "Atomic groups can't be placed inside a lookbehind, since they are emulated with a backreference that a lookbehind would match before its group.";
    }
    return true;
}

// Matches its tokens, in order, the first way they can match, and doesn't try any other way afterwards (backtracking
// into it), the way a walker step does. JavaScript has no atomic groups, so this is emulated with a lookahead that
// captures the match, followed by a backreference to the capture.
export class RGXAtomicToken extends RGXClassToken {
    tokens: RGXToken[];

    static check = createRGXClassGuardFunction(RGXAtomicToken);
    static assert = createAssertRGXClassGuardFunction(RGXAtomicToken);

    constructor(tokens: RGXToken = []) {
        super();
        // An array lists the tokens to concatenate. Anything else, including a union, is a single token.
        this.tokens = Array.isArray(tokens) ? [...tokens] : [tokens];
    }

    // The backreference consumes characters whenever the tokens do, so the tokens decide.
    get rgxIsRepeatable(): boolean {
        try {
            return !isNonConsumingRegexSource(withoutRGXInsertionChecks(() => rgxConcat(this.tokens)));
        } catch (err) {
            if (err instanceof RGXError) return true;

            // This is ignored because I don't know what kind of
            // unexpected errors might happen.
            /* istanbul ignore next */
            throw err;
        }
    }

    rgxAcceptInsertion(context: RGXInsertionContext): string | boolean {
        return rejectRGXAtomicInLookbehind(context);
    }

    atomic(): RGXAtomicToken {
        return this;
    }

    toRgx(currentFlags: string = ''): RGXToken {
        const source = rgxConcat(this.tokens, true, currentFlags);
        // Nothing to backtrack into.
        if (source === '') return null;
        return createRegexPiece(atomicRegexSource(source), currentFlags);
    }

    clone(depth: CloneDepth = "max") {
        if (depth === 0) return this;
        return new RGXAtomicToken(extClone(this.tokens, depthDecrement(depth, 1)));
    }

    static fromJSON(json: RGXJSONClassToken): RGXAtomicToken {
        const [tokens] = rgxJSONClassArgs(json, "RGXAtomicToken", parseAtomicJSONArgs);
        return new RGXAtomicToken(tokens === undefined ? [] : rgxTokenFromJSON(tokens));
    }

    toJSON(): RGXJSONClassToken {
        return createRGXJSONClassToken("RGXAtomicToken", [rgxTokenToJSON(this.tokens)]);
    }
}

export const rgxAtomic = createConstructFunction(RGXAtomicToken);
