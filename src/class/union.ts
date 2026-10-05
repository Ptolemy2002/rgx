import { createConstructFunction } from "src/internal";
import { RGXJSONToken, RGXToken } from "src/types";
import { RGXTokenCollection, RGXTokenCollectionInput } from "src/collection";
import { RGXClassToken } from "./base";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";
import { RGXJSONClassToken, RGXJSONValue } from "src/types";
import { createRGXJSONClassToken, rgxJSONClassArgs, rgxTokenFromJSON, rgxTokenToJSON } from "src/json";
import { isRGXJSONObjectToken, isRGXJSONToken } from "src/typeGuards";

export type RGXUnionInsertionPosition = 'prefix' | 'suffix';
export class RGXClassUnionToken extends RGXClassToken {
    tokens: RGXTokenCollection;
    
    static check = createRGXClassGuardFunction(RGXClassUnionToken);
    static assert = createAssertRGXClassGuardFunction(RGXClassUnionToken);

    constructor(tokens: RGXTokenCollectionInput = []) {
        super();
        if (tokens instanceof RGXTokenCollection && tokens.mode === 'concat') this.tokens = new RGXTokenCollection([tokens], 'union');
        else this.tokens = new RGXTokenCollection(tokens, 'union');
        this.cleanTokens();
    }

    cleanTokens() {
        this.tokens = removeRgxUnionDuplicates(...expandRgxUnionTokens(...this.tokens));
        return this;
    }

    add(token: RGXToken, pos: RGXUnionInsertionPosition = 'suffix') {
        if (token instanceof RGXTokenCollection && token.mode === 'union') return this.concat(pos, ...token);
        if (token instanceof RGXClassUnionToken) return this.concat(pos, ...token.tokens);

        if (pos === 'prefix') {
            this.tokens.unshift(token);
        } else {
            this.tokens.push(token);
        }

        return this.cleanTokens();
    }

    concat(pos: RGXUnionInsertionPosition = 'suffix', ...others: RGXTokenCollectionInput[]) {
        if (pos === 'suffix') {
            this.tokens = this.tokens.clone().concat(...others);
        } else {
            this.tokens = new RGXTokenCollection([...others, ...this.tokens], 'union');
        }

        return this.cleanTokens();
    }

    toRgx() {
        return this.tokens.toRgx();
    }

    clone(depth: CloneDepth="max") {
        if (depth === 0) return this;
        return new RGXClassUnionToken(this.tokens.clone(depthDecrement(depth, 1)));
    }

    static validateJSONArgs(args: RGXJSONValue[]): boolean | string {
        if (args.length > 1) return "Expected at most 1 argument (tokens).";
        if (args.length === 1 && !isRGXJSONToken(args[0])) return "Argument 0 (tokens) must be a JSON token.";
        return true;
    }

    static fromJSON(json: RGXJSONClassToken): RGXClassUnionToken {
        const [tokens] = rgxJSONClassArgs(json, "RGXClassUnionToken", RGXClassUnionToken.validateJSONArgs) as [RGXJSONToken?];
        return new RGXClassUnionToken(tokens === undefined ? [] : rgxTokenFromJSON(tokens));
    }

    toJSON(): RGXJSONClassToken {
        return createRGXJSONClassToken("RGXClassUnionToken", [rgxTokenToJSON(this.tokens.tokens)]);
    }
}

export function expandRgxUnionTokens(...tokens: RGXTokenCollectionInput[]): RGXTokenCollection {
    const result = new RGXTokenCollection();

    for (const token of tokens) {
        if (token instanceof RGXTokenCollection && token.mode === 'union') {
            result.push(...expandRgxUnionTokens(...token));
        } else if (Array.isArray(token)) {
            result.push(...expandRgxUnionTokens(...token));
        } else if (token instanceof RGXClassUnionToken) {
            result.push(...expandRgxUnionTokens(...token.tokens));
        } else {
            result.push(token);
        }
    }

    return result;
}

export function removeRgxUnionDuplicates(...tokens: RGXTokenCollectionInput[]): RGXTokenCollection {
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

    return new RGXTokenCollection(uniqueTokens, 'union');
}

export const rgxClassUnion = createConstructFunction(RGXClassUnionToken);