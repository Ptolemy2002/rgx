import isCallable from "is-callable";
import * as e from "./errors";
import * as t from "./types";

export * from "./errors";
export * from "./types";

export function isRGXNoOpToken(value: unknown): value is t.RGXNoOpToken {
    return value === null || value === undefined;
}

export function assertRGXNoOpToken(value: unknown): asserts value is t.RGXNoOpToken {
    if (!isRGXNoOpToken(value)) {
        throw new e.RGXInvalidTokenError(`Invalid no-op token`, 'null or undefined', value);
    }
}

export function isRGXLiteralToken(value: unknown): value is t.RGXLiteralToken {
    return value instanceof RegExp;
}

export function assertRGXLiteralToken(value: unknown): asserts value is t.RGXLiteralToken {
    if (!isRGXLiteralToken(value)) {
        throw new e.RGXInvalidTokenError(`Invalid literal token`, 'RegExp', value);
    }
}

export function isRGXNativeToken(value: unknown): value is t.RGXNativeToken {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'|| isRGXNoOpToken(value);
}

export function assertRGXNativeToken(value: unknown): asserts value is t.RGXNativeToken {
    if (!isRGXNativeToken(value)) {
        throw new e.RGXInvalidTokenError(`Invalid native token`, 'string, number, boolean, null, or undefined', value);
    }
}

export function isRGXConvertibleToken(value: unknown): value is t.RGXConvertibleToken {
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

export function assertRGXConvertibleToken(value: unknown): asserts value is t.RGXConvertibleToken {
    if (!isRGXConvertibleToken(value)) {
        throw new e.RGXInvalidTokenError(`Invalid convertible token`, 'object with a toRgx method that returns a valid token', value);
    }
}

export function rgxTokenType(value: t.RGXToken): t.RGXTokenType {
    if (isRGXNoOpToken(value)) return 'no-op';
    if (isRGXLiteralToken(value)) return 'literal';
    if (isRGXNativeToken(value)) return 'native';
    if (isRGXConvertibleToken(value)) return 'convertible';
    if (Array.isArray(value)) return value.map(rgxTokenType);

    // Ignoring this line since it should be impossible to reach if the types are correct, but we need it to satisfy the return type
    /* istanbul ignore next */
    throw new e.RGXInvalidTokenError(`Invalid RGX token: ${value}`, null, value);
}

export function rgxTokenFromType<T extends t.RGXTokenType>(type: T, value: t.RGXToken): t.RGXTokenFromType<T> {
    // Ignoring this line because the function is entirely a TypeScript utility that doesn't need to be tested at runtime.
    /* istanbul ignore next */
    return value as t.RGXTokenFromType<typeof type>;
}

export function isValidRegexString(value: string): value is t.ValidRegexString {
    try {
        new RegExp(value);
        return true;
    } catch {
        return false;
    }
}

export function assertValidRegexString(value: string): asserts value is t.ValidRegexString {
    if (!isValidRegexString(value)) {
        throw new e.RGXInvalidRegexStringError(`Invalid regex string: ${value}`, value);
    }
}

export function isValidVanillaRegexFlags(value: string): value is t.ValidVanillaRegexFlags {
    const patternMatch = /^[gimsuy]*$/.test(value);
    if (!patternMatch) return false;

    // No repeated flags allowed
    const flagsSet = new Set(value);
    return flagsSet.size === value.length;
}

export function assertValidVanillaRegexFlags(value: string): asserts value is t.ValidVanillaRegexFlags {
    if (!isValidVanillaRegexFlags(value)) {
        throw new e.RGXInvalidVanillaRegexFlagsError(`Invalid vanilla regex flags: ${value}`, value);
    }
}

export function escapeRegex(value: string) {
    return value.replaceAll(/[\-\^\$.*+?^${}()|[\]\\]/g, '\\$&') as t.ValidRegexString;
}

export function resolveRGXToken(token: t.RGXToken): t.ValidRegexString {
    if (isRGXNoOpToken(token)) return '' as t.ValidRegexString;
    if (isRGXLiteralToken(token)) return '(?:' + token.source + ')' as t.ValidRegexString;
    if (isRGXNativeToken(token)) return escapeRegex(String(token));

    if (isRGXConvertibleToken(token)) {
        return resolveRGXToken(token.toRgx());
    }

    // Interpret arrays as unions
    if (Array.isArray(token)) {
        if (token.length === 0) return '' as t.ValidRegexString;
        
        if (token.length > 1) {
            return '(?:' + token.map(resolveRGXToken).join('|') + ')' as t.ValidRegexString;
        }

        return resolveRGXToken(token[0]);
    }

    // Ignoring this line since it should be impossible to reach if the types are correct, but we need it to satisfy the return type
    /* istanbul ignore next */
    throw new e.RGXInvalidTokenError(`Invalid RGX token: ${token}`, null, token);
}

// Wrapper for letting an array of tokens be resolved as a concatenation instead of a union.
export function rgxConcat(tokens: t.RGXToken[]): t.ValidRegexString {
    return tokens.map(resolveRGXToken).join('') as t.ValidRegexString;
}

export default function rgx(flags: string = '') {
    assertValidVanillaRegexFlags(flags);
    return (strings: TemplateStringsArray, ...tokens: t.RGXToken[]) => {
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