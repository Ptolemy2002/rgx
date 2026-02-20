import * as t from "./types";
import * as e from "./errors";
import isCallable from "is-callable";

export function isRGXNoOpToken(value: unknown): value is t.RGXNoOpToken {
    return value === null || value === undefined;
}

export function assertRGXNoOpToken(value: unknown): asserts value is t.RGXNoOpToken {
    if (!isRGXNoOpToken(value)) {
        throw new e.RGXInvalidTokenError(`Invalid no-op token`, {type: "tokenType", values: ['no-op']}, value);
    }
}

export function isRGXLiteralToken(value: unknown): value is t.RGXLiteralToken {
    return value instanceof RegExp;
}

export function assertRGXLiteralToken(value: unknown): asserts value is t.RGXLiteralToken {
    if (!isRGXLiteralToken(value)) {
        throw new e.RGXInvalidTokenError("Invalid literal token", {type: "tokenType", values: ['literal']}, value);
    }
}

export function isRGXNativeToken(value: unknown): value is t.RGXNativeToken {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'|| isRGXNoOpToken(value);
}

export function assertRGXNativeToken(value: unknown): asserts value is t.RGXNativeToken {
    if (!isRGXNativeToken(value)) {
        throw new e.RGXInvalidTokenError("Invalid native token", {type: "tokenType", values: ['native']}, value);
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
        throw new e.RGXInvalidTokenError(`Invalid convertible token`, {type: "tokenType", values: ['convertible']}, value);
    }
}

export function isRGXArrayToken(value: unknown): value is t.RGXToken[] {
    return Array.isArray(value) && value.every(
        item =>
            isRGXNoOpToken(item) || isRGXLiteralToken(item) ||
            isRGXNativeToken(item) ||
            isRGXConvertibleToken(item) || isRGXArrayToken(item)
    );
}

export function assertRGXArrayToken(value: unknown): asserts value is t.RGXToken[] {
    if (!isRGXArrayToken(value)) {
        throw new e.RGXInvalidTokenError("Invalid array token", {type: "tokenType", values: ['array']}, value);
    }
}

export function rgxTokenTypeFlat(value: t.RGXToken): t.RGXTokenTypeFlat {
    if (isRGXNoOpToken(value)) return 'no-op';
    if (isRGXLiteralToken(value)) return 'literal';
    if (isRGXNativeToken(value)) return 'native';
    if (isRGXConvertibleToken(value)) return 'convertible';
    if (Array.isArray(value)) return 'array';

    // Ignoring this line since it should be impossible to reach if the types are correct, but we need it to satisfy the return type
    /* istanbul ignore next */
    throw new e.RGXInvalidTokenError("Invalid RGX token", null, value);
}

export function rgxTokenType(value: t.RGXToken): t.RGXTokenType {
    const flatType = rgxTokenTypeFlat(value);
    if (flatType !== 'array') return flatType;
    if (flatType === 'array') return (value as t.RGXToken[]).map(rgxTokenType);

    // Ignoring this line since it should be impossible to reach if the types are correct, but we need it to satisfy the return type
    /* istanbul ignore next */
    throw new e.RGXInvalidTokenError("Invalid RGX token", null, value);
}

export function rgxTokenFromType<T extends t.RGXTokenTypeGuardInput>(type: T, value: t.RGXToken): t.RGXTokenFromType<T> {
    // Ignoring this line because the function is entirely a TypeScript utility that doesn't need to be tested at runtime.
    /* istanbul ignore next */
    return value as t.RGXTokenFromType<typeof type>;
}

export function rgxTokenTypeToFlat(type: t.RGXTokenType): t.RGXTokenTypeFlat {
    return Array.isArray(type) ? 'array' : type;
}

export function rgxTokenTypeGuardInputToFlat(type: t.RGXTokenTypeGuardInput): t.RGXTokenTypeFlat | null {
    if (type === null) return null;
    if (Array.isArray(type)) return 'array';
    return type;
}

export function isRGXToken<
    T extends t.RGXTokenTypeGuardInput = null
>(value: unknown, type: T = null as T, matchLength: boolean = true): value is t.RGXTokenFromType<T> {
    function typeMatches(s: string) {
        return type === null || type === s;
    }

    if (typeMatches('no-op') && isRGXNoOpToken(value)) return true;
    if (typeMatches('literal') && isRGXLiteralToken(value)) return true;
    if (typeMatches('native') && isRGXNativeToken(value)) return true;
    if (typeMatches('convertible') && isRGXConvertibleToken(value)) return true;
    if (typeMatches('array') && isRGXArrayToken(value)) return true;

    if (Array.isArray(type) && Array.isArray(value) && (!matchLength || type.length === value.length)) {
        // This will always be false.
        if (value.length < type.length) return false;
        // @ts-ignore Excessively deep type is not a problem here.
        return value.every((item, i) => isRGXToken(item, type[i] ?? null));
    }
    
    return false;
}

export function assertRGXToken<
    T extends t.RGXTokenTypeGuardInput = null
>(value: unknown, type: T = null as T, matchLength: boolean = true): asserts value is t.RGXTokenFromType<T> {
    if (!isRGXToken(value, type, matchLength)) {
        const flatType = rgxTokenTypeGuardInputToFlat(type);
        throw new e.RGXInvalidTokenError("Invalid RGX token", flatType === null ? null : {type: "tokenType", values: [flatType]}, value);
    }
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
        throw new e.RGXInvalidRegexStringError("Invalid regex string", value);
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
        throw new e.RGXInvalidVanillaRegexFlagsError("Invalid vanilla regex flags", value);
    }
}