import { createConstructFunction, createRegexPiece } from "src/internal";
import { RGXJSONToken, RGXToken } from "src/types";
import { resolveRGXToken } from "src/resolve";
import { RGXClassToken } from "./base";
import { CloneDepth, depthDecrement, extClone } from "@ptolemy2002/immutability-utils";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";
import { RGXJSONClassToken, RGXJSONValue } from "src/types";
import { createRGXJSONClassToken, rgxJSONClassArgs, rgxTokenFromJSON, rgxTokenToJSON } from "src/json";
import { isRGXJSONObjectToken, isRGXJSONToken } from "src/typeGuards";

export type RGXUnionInsertionPosition = 'prefix' | 'suffix';
function parseUnionJSONArgs(args: RGXJSONValue[]): [RGXJSONToken?] | string {
    if (args.length > 1) return "Expected at most 1 argument (tokens).";
    const [tokens] = args;
    if (tokens !== undefined && !isRGXJSONToken(tokens, false)) return "Argument 0 (tokens) must be a JSON token.";
    return [tokens];
}

export class RGXClassUnionToken extends RGXClassToken {
    tokens: RGXToken[];
    
    static check = createRGXClassGuardFunction(RGXClassUnionToken);
    static assert = createAssertRGXClassGuardFunction(RGXClassUnionToken);

    // An array or another union lists the alternatives. Anything else is a single alternative.
    constructor(tokens: RGXToken = []) {
        super();
        this.tokens = [tokens];
        this.cleanTokens();
    }

    cleanTokens() {
        this.tokens = removeRgxUnionDuplicates(...expandRgxUnionTokens(...this.tokens));
        return this;
    }

    add(token: RGXToken, pos: RGXUnionInsertionPosition = 'suffix') {
        // Arrays and unions are expanded into their alternatives by cleanTokens.
        if (pos === 'prefix') {
            this.tokens.unshift(token);
        } else {
            this.tokens.push(token);
        }

        return this.cleanTokens();
    }

    concat(pos: RGXUnionInsertionPosition = 'suffix', ...others: RGXToken[]) {
        if (pos === 'suffix') {
            this.tokens = [...this.tokens, ...others];
        } else {
            this.tokens = [...others, ...this.tokens];
        }

        return this.cleanTokens();
    }

    toRgx(currentFlags: string = '') {
        // The pattern will already be wrapped by resolveRGXToken, so it doesn't need to be wrapped again here.
        return createRegexPiece(resolveRGXToken(this.tokens, { groupWrap: false, currentFlags }), currentFlags);
    }

    clone(depth: CloneDepth="max") {
        if (depth === 0) return this;
        return new RGXClassUnionToken(extClone(this.tokens, depthDecrement(depth, 1)));
    }

    static fromJSON(json: RGXJSONClassToken): RGXClassUnionToken {
        const [tokens] = rgxJSONClassArgs(json, "RGXClassUnionToken", parseUnionJSONArgs);
        return new RGXClassUnionToken(tokens === undefined ? [] : rgxTokenFromJSON(tokens));
    }

    toJSON(): RGXJSONClassToken {
        return createRGXJSONClassToken("RGXClassUnionToken", [rgxTokenToJSON(this.tokens)]);
    }
}

export function expandRgxUnionTokens(...tokens: RGXToken[]): RGXToken[] {
    const result: RGXToken[] = [];

    for (const token of tokens) {
        if (Array.isArray(token)) {
            result.push(...expandRgxUnionTokens(...token));
        } else if (token instanceof RGXClassUnionToken) {
            result.push(...expandRgxUnionTokens(...token.tokens));
        } else {
            result.push(token);
        }
    }

    return result;
}

export function removeRgxUnionDuplicates(...tokens: RGXToken[]): RGXToken[] {
    let uniqueTokens = [...new Set<RGXToken>(tokens)];

    // Handle RegExp objects separately since they are not considered equal even if they have the same pattern and flags.
    // JSON object tokens get the same treatment, compared by their serialized form.
    const seenRegexes = new Set<string>();
    const seenJSON = new Set<string>();
    uniqueTokens = uniqueTokens.filter(token => {
        if (token instanceof RegExp) {
            const regexString = token.toString();
            if (seenRegexes.has(regexString)) {
                return false;
            } else {
                seenRegexes.add(regexString);
                return true;
            }
        }

        if (isRGXJSONObjectToken(token, false)) {
            const jsonString = JSON.stringify(token);
            if (seenJSON.has(jsonString)) {
                return false;
            } else {
                seenJSON.add(jsonString);
                return true;
            }
        }

        return true;
    });

    return uniqueTokens;
}

export const rgxClassUnion = createConstructFunction(RGXClassUnionToken);