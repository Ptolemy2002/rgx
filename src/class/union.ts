import { createConstructFunction } from "src/internal";
import { RGXToken } from "src/types";
import { RGXTokenCollection, RGXTokenCollectionInput } from "src/collection";
import { RGXClassToken } from "./base";

export type RGXUnionInsertionPosition = 'prefix' | 'suffix';
export class RGXClassUnionToken extends RGXClassToken {
    tokens: RGXTokenCollection;

    get isGroup() {
        return true;
    }

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

    // Handle RegExp objects separately since they are not considered equal even if they have the same pattern and flags
    const seenRegexes = new Set<string>();
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
        return true;
    });

    return new RGXTokenCollection(uniqueTokens, 'union');
}

export const rgxClassUnion = createConstructFunction(RGXClassUnionToken);