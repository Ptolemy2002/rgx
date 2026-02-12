import isCallable from "is-callable";
import { Branded } from "@ptolemy2002/ts-brand-utils";

export type RGXNoOpToken = null | undefined;
export type RGXLiteralToken = RegExp;
export type RGXNativeToken = string | number | boolean | RGXNoOpToken;
export type RGXConvertibleToken = { toRgx: () => RGXNativeToken | RGXNativeToken[] };
export type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXToken[];

export type RGXTokenType = 'no-op' | 'literal' | 'native' | 'convertible' | RGXTokenType[];
export type RGXTokenFromType<T extends RGXTokenType> =
    T extends 'no-op' ? RGXNoOpToken :
    T extends 'literal' ? RGXLiteralToken :
    T extends 'native' ? RGXNativeToken :
    T extends 'convertible' ? RGXConvertibleToken :
    T extends RGXTokenType[] ? { [K in keyof T]: T[K] extends RGXTokenType ? RGXTokenFromType<T[K]> : never } :
    never
;

export const validRegexSymbol = Symbol('ValidRegex');
export type ValidRegexBrandSymbol = typeof validRegexSymbol;
export type ValidRegexString = Branded<string, [ValidRegexBrandSymbol]>;

export function isRGXNoOpToken(value: unknown): value is RGXNoOpToken {
    return value === null || value === undefined;
}

export function isRGXLiteralToken(value: unknown): value is RGXLiteralToken {
    return value instanceof RegExp;
}

export function isRGXNativeToken(value: unknown): value is RGXNativeToken {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'|| isRGXNoOpToken(value);
}

export function isRGXConvertibleToken(value: unknown): value is RGXConvertibleToken {
    if (typeof value === 'object' && value !== null && 'toRgx' in value) {
        if (isCallable(value.toRgx)) {
            const returnValue = value.toRgx();

            if (Array.isArray(returnValue)) {
                return returnValue.every(isRGXNativeToken);
            }

            return isRGXNativeToken(returnValue);
        }

        return false;
    }

    return false;
}

export function rgxTokenType(value: RGXToken): RGXTokenType {
    if (isRGXNoOpToken(value)) return 'no-op';
    if (isRGXLiteralToken(value)) return 'literal';
    if (isRGXNativeToken(value)) return 'native';
    if (isRGXConvertibleToken(value)) return 'convertible';
    if (Array.isArray(value)) return value.map(rgxTokenType);

    // Ignoring this line since it should be impossible to reach if the types are correct, but we need it to satisfy the return type
    /* istanbul ignore next */
    throw new TypeError(`Invalid RGX token: ${value}`);
}

export function rgxTokenFromType<T extends RGXTokenType>(type: T, value: RGXToken): RGXTokenFromType<T> {
    // Ignoring this line because the function is entirely a TypeScript utility that doesn't need to be tested at runtime.
    /* istanbul ignore next */
    return value as RGXTokenFromType<typeof type>;
}

export function isValidRegex(value: string): value is ValidRegexString {
    try {
        new RegExp(value);
        return true;
    } catch {
        return false;
    }
}

export function escapeRegex(value: string) {
    return value.replaceAll(/[\-\^\$.*+?^${}()|[\]\\]/g, '\\$&') as ValidRegexString;
}

export function resolveRGXToken(token: RGXToken): ValidRegexString {
    if (isRGXNoOpToken(token)) return '' as ValidRegexString;
    if (isRGXLiteralToken(token)) return '(?:' + token.source + ')' as ValidRegexString;
    if (isRGXNativeToken(token)) return escapeRegex(String(token));

    if (isRGXConvertibleToken(token)) {
        return resolveRGXToken(token.toRgx());
    }

    // Interpret arrays as unions
    if (Array.isArray(token)) {
        if (token.length === 0) return '' as ValidRegexString;
        
        if (token.length > 1) {
            return '(?:' + token.map(resolveRGXToken).join('|') + ')' as ValidRegexString;
        }

        return resolveRGXToken(token[0]);
    }

    // Ignoring this line since it should be impossible to reach if the types are correct, but we need it to satisfy the return type
    /* istanbul ignore next */
    throw new TypeError(`Invalid RGX token: ${token}`);
}

// Wrapper for letting an array of tokens be resolved as a concatenation instead of a union.
export function rgxConcat(tokens: RGXToken[]): ValidRegexString {
    return tokens.map(resolveRGXToken).join('') as ValidRegexString;
}

export default function rgx(strings: TemplateStringsArray, ...tokens: RGXToken[]): RegExp {
    let pattern = '';
    const resolvedTokens = tokens.map(resolveRGXToken);

    for (let i = 0; i < strings.length; i++) {
        pattern += strings[i];
        if (i < resolvedTokens.length) {
            pattern += resolvedTokens[i];
        }
    }
    
    return new RegExp(pattern);
}