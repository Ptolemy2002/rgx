import isCallable from "is-callable";
import { Branded } from "@ptolemy2002/ts-brand-utils";
import { MaybeArray } from "@ptolemy2002/ts-utils";
import { RGXInvalidTokenError, RGXInvalidRegexStringError, RGXInvalidVanillaRegexFlagsError } from "./errors";

export * from "./errors";

export type RGXNoOpToken = null | undefined;
export type RGXLiteralToken = RegExp;
export type RGXNativeToken = string | number | boolean | RGXNoOpToken;
export type RGXConvertibleToken = { toRgx: () => MaybeArray<RGXNativeToken | RGXLiteralToken> };
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

export const validRegexSymbol = Symbol('rgx.ValidRegex');
export type ValidRegexBrandSymbol = typeof validRegexSymbol;
export type ValidRegexString = Branded<string, [ValidRegexBrandSymbol]>;

export const validVanillaRegexFlagsSymbol = Symbol('rgx.ValidVanillaRegexFlags');
export type ValidVanillaRegexFlagsBrandSymbol = typeof validVanillaRegexFlagsSymbol;
export type ValidVanillaRegexFlags = Branded<string, [ValidVanillaRegexFlagsBrandSymbol]>;

export function isRGXNoOpToken(value: unknown): value is RGXNoOpToken {
    return value === null || value === undefined;
}

export function assertRGXNoOpToken(value: unknown): asserts value is RGXNoOpToken {
    if (!isRGXNoOpToken(value)) {
        throw new RGXInvalidTokenError(`Invalid no-op token`, 'null or undefined', value);
    }
}

export function isRGXLiteralToken(value: unknown): value is RGXLiteralToken {
    return value instanceof RegExp;
}

export function assertRGXLiteralToken(value: unknown): asserts value is RGXLiteralToken {
    if (!isRGXLiteralToken(value)) {
        throw new RGXInvalidTokenError(`Invalid literal token`, 'RegExp', value);
    }
}

export function isRGXNativeToken(value: unknown): value is RGXNativeToken {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'|| isRGXNoOpToken(value);
}

export function assertRGXNativeToken(value: unknown): asserts value is RGXNativeToken {
    if (!isRGXNativeToken(value)) {
        throw new RGXInvalidTokenError(`Invalid native token`, 'string, number, boolean, null, or undefined', value);
    }
}

export function isRGXConvertibleToken(value: unknown): value is RGXConvertibleToken {
    if (typeof value === 'object' && value !== null && 'toRgx' in value) {
        if (isCallable(value.toRgx)) {
            const returnValue = value.toRgx();

            if (Array.isArray(returnValue)) {
                return returnValue.every(value => isRGXNativeToken(value) || isRGXLiteralToken(value));
            }

            return isRGXNativeToken(returnValue) || isRGXLiteralToken(returnValue);
        }

        return false;
    }

    return false;
}

export function assertRGXConvertibleToken(value: unknown): asserts value is RGXConvertibleToken {
    if (!isRGXConvertibleToken(value)) {
        throw new RGXInvalidTokenError(`Invalid convertible token`, 'object with a toRgx method that returns a valid token', value);
    }
}

export function rgxTokenType(value: RGXToken): RGXTokenType {
    if (isRGXNoOpToken(value)) return 'no-op';
    if (isRGXLiteralToken(value)) return 'literal';
    if (isRGXNativeToken(value)) return 'native';
    if (isRGXConvertibleToken(value)) return 'convertible';
    if (Array.isArray(value)) return value.map(rgxTokenType);

    // Ignoring this line since it should be impossible to reach if the types are correct, but we need it to satisfy the return type
    /* istanbul ignore next */
    throw new RGXInvalidTokenError(`Invalid RGX token: ${value}`, null, value);
}

export function rgxTokenFromType<T extends RGXTokenType>(type: T, value: RGXToken): RGXTokenFromType<T> {
    // Ignoring this line because the function is entirely a TypeScript utility that doesn't need to be tested at runtime.
    /* istanbul ignore next */
    return value as RGXTokenFromType<typeof type>;
}

export function isValidRegexString(value: string): value is ValidRegexString {
    try {
        new RegExp(value);
        return true;
    } catch {
        return false;
    }
}

export function assertValidRegexString(value: string): asserts value is ValidRegexString {
    if (!isValidRegexString(value)) {
        throw new RGXInvalidRegexStringError(`Invalid regex string: ${value}`, value);
    }
}

export function isValidVanillaRegexFlags(value: string): value is ValidVanillaRegexFlags {
    const patternMatch = /^[gimsuy]*$/.test(value);
    if (!patternMatch) return false;

    // No repeated flags allowed
    const flagsSet = new Set(value);
    return flagsSet.size === value.length;
}

export function assertValidVanillaRegexFlags(value: string): asserts value is ValidVanillaRegexFlags {
    if (!isValidVanillaRegexFlags(value)) {
        throw new RGXInvalidVanillaRegexFlagsError(`Invalid vanilla regex flags: ${value}`, value);
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
    throw new RGXInvalidTokenError(`Invalid RGX token: ${token}`, null, token);
}

// Wrapper for letting an array of tokens be resolved as a concatenation instead of a union.
export function rgxConcat(tokens: RGXToken[]): ValidRegexString {
    return tokens.map(resolveRGXToken).join('') as ValidRegexString;
}

export default function rgx(flags: string = '') {
    assertValidVanillaRegexFlags(flags);
    return (strings: TemplateStringsArray, ...tokens: RGXToken[]) => {
        let pattern = '';
        const resolvedTokens = tokens.map(resolveRGXToken);

        for (let i = 0; i < strings.length; i++) {
            pattern += strings[i];
            if (i < resolvedTokens.length) {
                pattern += resolvedTokens[i];
            }
        }
        
        return new RegExp(pattern, flags);
    };
}