import * as t from "./types";
import * as e from "./errors";
import isCallable from "is-callable";
import { isConstructor, isNonConsumingRGXToken, isSingletonRegexSource } from "./internal";
import { resolveRGXToken } from "./resolve";
import { RGXClassToken } from "./class";
import { ExtRegExp } from "./ExtRegExp";
import { RGXTokenCollection } from "./collection";
import { getRGXJSONClass, hasRGXJSONClass, rgxTokenFromJSON } from "./json";
import { createRegex } from "./utils/createRegex";
import { extractVanillaRegexFlags, isValidRegexFlags } from "./ExtRegExp";

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

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

export function isRGXConvertibleToken(value: unknown, returnCheck: boolean = true, acceptJSON: boolean = true): value is t.RGXConvertibleToken {
    if (typeof value === 'object' && value !== null && 'toRgx' in value) {
        // The rgxIsRepeatable property is optional, but if it is set it must be a boolean.
        if ('rgxIsRepeatable' in value && value.rgxIsRepeatable !== undefined && typeof value.rgxIsRepeatable !== 'boolean') return false;

        // If the rgxAcceptInsertion property exists, it must be a function that returns a string or boolean.
        if ('rgxAcceptInsertion' in value) {
            if (!isCallable(value.rgxAcceptInsertion)) return false;

            if (returnCheck) {
                const acceptResult = value.rgxAcceptInsertion([], '' as t.ValidRegexFlags);
                if (typeof acceptResult !== 'string' && typeof acceptResult !== 'boolean') return false;
            }
        }

        if (isCallable(value.toRgx)) {
            if (!returnCheck) return true;
            const rv = value.toRgx();
            return isRGXNativeToken(rv) || isRGXLiteralToken(rv) || 
                isRGXNoOpToken(rv) || isRGXInterpolationToken(rv) || isRGXArrayToken(rv, true, acceptJSON) ||
                (acceptJSON && isRGXJSONObjectToken(rv)) ||
                isRGXConvertibleToken(rv, true, acceptJSON);
        }

        return false;
    }

    return false;
}

export function assertRGXConvertibleToken(value: unknown, returnCheck: boolean = true, acceptJSON: boolean = true): asserts value is t.RGXConvertibleToken {
    if (!isRGXConvertibleToken(value, returnCheck, acceptJSON)) {
        throw new e.RGXInvalidTokenError(`Invalid convertible token`, {type: "tokenType", values: ['convertible']}, value);
    }
}

// Interpolation tokens never have a toRgx method, so they are never convertible tokens.
export function isRGXInterpolationToken(value: unknown): value is t.RGXInterpolationToken {
    return (
        typeof value === 'object' && value !== null && !Array.isArray(value) &&
        'rgxInterpolation' in value && typeof value.rgxInterpolation === 'string' &&
        !('toRgx' in value)
    );
}

export function assertRGXInterpolationToken(value: unknown): asserts value is t.RGXInterpolationToken {
    if (!isRGXInterpolationToken(value)) {
        throw new e.RGXInvalidTokenError("Invalid interpolation token", {type: "tokenType", values: ['interpolation']}, value);
    }
}

export function isRGXArrayToken(value: unknown, contentCheck: boolean = true, acceptJSON: boolean = true): value is t.RGXToken[] {
    return Array.isArray(value) && (!contentCheck || value.every(
        item =>
            isRGXNoOpToken(item) || isRGXLiteralToken(item) ||
            isRGXNativeToken(item) || isRGXInterpolationToken(item) ||
            (acceptJSON && isRGXJSONObjectToken(item)) ||
            isRGXConvertibleToken(item, true, acceptJSON) || isRGXArrayToken(item, true, acceptJSON)
    ));
}

export function assertRGXArrayToken(value: unknown, contentCheck: boolean = true, acceptJSON: boolean = true): asserts value is t.RGXToken[] {
    if (!isRGXArrayToken(value, contentCheck, acceptJSON)) {
        throw new e.RGXInvalidTokenError("Invalid array token", {type: "tokenType", values: ['array']}, value);
    }
}

export function isRGXJSONValue(value: unknown): value is t.RGXJSONValue {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (Array.isArray(value)) return value.every(item => isRGXJSONValue(item));
    // undefined values are dropped by JSON.stringify, so they are allowed inside objects.
    if (isPlainObject(value)) return Object.values(value).every(item => item === undefined || isRGXJSONValue(item));
    return false;
}

export function assertRGXJSONValue(value: unknown): asserts value is t.RGXJSONValue {
    if (!isRGXJSONValue(value)) {
        throw new e.RGXInvalidJSONTokenError("Invalid JSON value", { type: "custom", values: ["null", "string", "finite number", "boolean", "array of JSON values", "plain object of JSON values"] }, value);
    }
}

export function isRGXJSONNativeToken(value: unknown): value is t.RGXJSONNativeToken {
    return value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value));
}

export function assertRGXJSONNativeToken(value: unknown): asserts value is t.RGXJSONNativeToken {
    if (!isRGXJSONNativeToken(value)) {
        throw new e.RGXInvalidJSONTokenError("Invalid JSON native token", { type: "custom", values: ["string", "finite number", "boolean", "null"] }, value);
    }
}

function hasRGXJSONFlag(value: unknown): value is Record<string, unknown> & { $rgx: true } {
    return isPlainObject(value) && value[t.RGX_JSON_FLAG] === true;
}

export function isRGXJSONLiteralToken(value: unknown, contentCheck: boolean = true): value is t.RGXJSONLiteralToken {
    if (!hasRGXJSONFlag(value)) return false;
    if (typeof value.source !== 'string' || 'class' in value || 'interpolation' in value) return false;
    if ('flags' in value && value.flags !== undefined && typeof value.flags !== 'string') return false;
    if (!contentCheck) return true;

    const flags = (value.flags as string | undefined) ?? '';
    if (!isValidRegexFlags(flags)) return false;

    try {
        createRegex(value.source, extractVanillaRegexFlags(flags));
        return true;
    } catch (err) {
        if (err instanceof e.RGXInvalidRegexStringError) return false;

        // This is ignored because I don't know what kind of
        // unexpected errors might happen.
        /* istanbul ignore next */
        throw err;
    }
}

export function assertRGXJSONLiteralToken(value: unknown, contentCheck: boolean = true): asserts value is t.RGXJSONLiteralToken {
    if (!isRGXJSONLiteralToken(value, contentCheck)) {
        throw new e.RGXInvalidJSONTokenError("Invalid JSON literal token", { type: "custom", values: ["object with $rgx set to true, a valid regex source string, and optional valid flags"] }, value);
    }
}

export function isRGXJSONClassToken(value: unknown, registryCheck: boolean = true): value is t.RGXJSONClassToken {
    if (!hasRGXJSONFlag(value)) return false;
    if (typeof value.class !== 'string' || 'source' in value || 'interpolation' in value) return false;
    if ('args' in value && value.args !== undefined && !(Array.isArray(value.args) && isRGXJSONValue(value.args))) return false;
    if (!registryCheck) return true;

    if (!hasRGXJSONClass(value.class)) return false;

    // Constructors validate their own args, so the args are valid exactly when constructing succeeds.
    try {
        getRGXJSONClass(value.class)((value.args as t.RGXJSONValue[] | undefined) ?? []);
        return true;
    } catch (err) {
        if (err instanceof e.RGXError) return false;
        throw err;
    }
}

export function assertRGXJSONClassToken(value: unknown, registryCheck: boolean = true): asserts value is t.RGXJSONClassToken {
    if (!isRGXJSONClassToken(value, registryCheck)) {
        throw new e.RGXInvalidJSONTokenError("Invalid JSON class token", { type: "custom", values: ["object with $rgx set to true, a registered class name, and optional args the class can be constructed from"] }, value);
    }
}

// The interpolation doesn't have to be a valid regex on its own, so there is no content to check.
export function isRGXJSONInterpolationToken(value: unknown): value is t.RGXJSONInterpolationToken {
    if (!hasRGXJSONFlag(value)) return false;
    return typeof value.interpolation === 'string' && !('source' in value) && !('class' in value);
}

export function assertRGXJSONInterpolationToken(value: unknown): asserts value is t.RGXJSONInterpolationToken {
    if (!isRGXJSONInterpolationToken(value)) {
        throw new e.RGXInvalidJSONTokenError("Invalid JSON interpolation token", { type: "custom", values: ["object with $rgx set to true and an interpolation string"] }, value);
    }
}

export function isRGXJSONObjectToken(value: unknown, contentCheck: boolean = true): value is t.RGXJSONObjectToken {
    return isRGXJSONLiteralToken(value, contentCheck) || isRGXJSONClassToken(value, contentCheck) || isRGXJSONInterpolationToken(value);
}

export function assertRGXJSONObjectToken(value: unknown, contentCheck: boolean = true): asserts value is t.RGXJSONObjectToken {
    if (!isRGXJSONObjectToken(value, contentCheck)) {
        throw new e.RGXInvalidJSONTokenError("Invalid JSON object token", { type: "custom", values: ["JSON literal token", "JSON class token", "JSON interpolation token"] }, value);
    }
}

export function isRGXJSONToken(value: unknown, contentCheck: boolean = true): value is t.RGXJSONToken {
    if (isRGXJSONNativeToken(value)) return true;
    if (isRGXJSONObjectToken(value, contentCheck)) return true;
    if (Array.isArray(value)) return !contentCheck || value.every(item => isRGXJSONToken(item, contentCheck));
    return false;
}

export function assertRGXJSONToken(value: unknown, contentCheck: boolean = true): asserts value is t.RGXJSONToken {
    if (!isRGXJSONToken(value, contentCheck)) {
        throw new e.RGXInvalidJSONTokenError("Invalid JSON token", { type: "tokenType", values: ["json"] }, value);
    }
}

export function rgxTokenTypeFlat(value: unknown, recognizeClass: boolean = true, acceptJSON: boolean = true): t.RGXTokenTypeFlat {
    if (isRGXNoOpToken(value)) return 'no-op';
    if (isRGXLiteralToken(value)) return 'literal';
    if (isRGXNativeToken(value)) return 'native';
    if (isRGXInterpolationToken(value)) return 'interpolation';
    // We have to check class before convertible because class tokens are also convertible.
    if (recognizeClass && RGXClassToken.check(value)) return 'class';
    // JSON object tokens are checked before convertible tokens, since the flag signals explicit intent.
    if (acceptJSON && isRGXJSONObjectToken(value)) return 'json';
    if (isRGXConvertibleToken(value, true, acceptJSON)) return 'convertible';
    if (isRGXArrayToken(value, true, acceptJSON)) return 'array';
    
    throw new e.RGXInvalidTokenError("Invalid RGX token", null, value);
}

export function rgxTokenType(value: unknown, recognizeClass: boolean = true, acceptJSON: boolean = true): t.RGXTokenType {
    const flatType = rgxTokenTypeFlat(value, recognizeClass, acceptJSON);
    if (flatType !== 'array') return flatType;
    else return (value as t.RGXToken[]).map(item => rgxTokenType(item, recognizeClass, acceptJSON));
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
    if (type === RegExp || type === ExtRegExp) return 'literal';
    if (type === RGXTokenCollection) return 'convertible';
    if (isConstructor(type)) return 'class';
    if (type === "repeatable") return null;

    return type;
}

export function isRGXToken<
    T extends t.RGXTokenTypeGuardInput = null,
    J extends boolean = true
>(value: unknown, type: T = null as T, matchLength: boolean = true, acceptJSON: J = true as J): value is t.RGXTokenFromType<T, J> {
    if (isConstructor(type)) {
        if (value instanceof type) return true;
        return acceptJSON && isRGXJSONClassToken(value) && rgxTokenFromJSON(value) instanceof type;
    }

    function typeMatches(s: string) {
        return type === null || type === s;
    }
    
    if (typeMatches('no-op') && isRGXNoOpToken(value)) return true;
    if (typeMatches('literal') && isRGXLiteralToken(value)) return true;
    if (typeMatches('literal') && acceptJSON && isRGXJSONLiteralToken(value)) return true;
    if (typeMatches('native') && isRGXNativeToken(value)) return true;
    if (typeMatches('interpolation') && isRGXInterpolationToken(value)) return true;
    if (typeMatches('interpolation') && acceptJSON && isRGXJSONInterpolationToken(value)) return true;

    // We have to check class before convertible because class tokens are also convertible.
    if (typeMatches('class') && RGXClassToken.check(value)) return true;
    if (typeMatches('class') && acceptJSON && isRGXJSONClassToken(value)) return true;
    if (typeMatches('convertible') && isRGXConvertibleToken(value, true, acceptJSON)) return true;
    // JSON class tokens become class tokens (which are convertible) when converted.
    if (typeMatches('convertible') && acceptJSON && isRGXJSONClassToken(value)) return true;

    // The 'json' type is explicit, so it ignores acceptJSON.
    if (type === 'json' && isRGXJSONToken(value)) return true;

    if (type === 'repeatable' && isRGXJSONObjectToken(value)) {
        if (!acceptJSON) return false;
        // Converting a JSON token yields a literal, class, or interpolation token, so we can check that instead.
        return isRGXToken(rgxTokenFromJSON(value), 'repeatable', true, false);
    }

    // Interpolation tokens are source fragments, which can't be repeated as a unit.
    if (type === 'repeatable' && isRGXInterpolationToken(value)) return false;

    // Non-covertible tokens are repeatable by default. Convertible tokens trust their rgxIsRepeatable property when it is
    // set, and otherwise are only non-repeatable if they are detected as consuming no characters.
    if (type === 'repeatable' && !isRGXConvertibleToken(value, false)) return true;
    if (type === 'repeatable' && isRGXConvertibleToken(value, true, acceptJSON)) return value.rgxIsRepeatable ?? !isNonConsumingRGXToken(value);

    if (typeMatches('array') && isRGXArrayToken(value, true, acceptJSON)) return true;

    if (Array.isArray(type) && Array.isArray(value) && (!matchLength || type.length === value.length)) {
        // This will always be false.
        if (value.length < type.length) return false;
        // @ts-ignore Excessively deep type is not a problem here.
        return value.every((item, i) => isRGXToken(item, type[i] ?? null, true, acceptJSON));
    }
    
    return false;
}

export function assertRGXToken<
    T extends t.RGXTokenTypeGuardInput = null,
    J extends boolean = true
>(value: unknown, type: T = null as T, matchLength: boolean = true, acceptJSON: J = true as J): asserts value is t.RGXTokenFromType<T, J> {
    // Captured before narrowing, since the narrowed type of `value` in the failure branch is excessively deep for TypeScript.
    const got: unknown = value;
    if (!isRGXToken(value, type, matchLength, acceptJSON)) {
        const flatType = rgxTokenTypeGuardInputToFlat(type);
        throw new e.RGXInvalidTokenError("Invalid RGX token", flatType === null ? null : {type: "tokenType", values: [flatType]}, got);
    }
}

// Whether the token resolves to a singleton: exactly one unit that a quantifier can apply to as a whole, such as a
// single character, escape, character class, or (non-assertion) group.
export function isRGXSingletonToken(value: unknown, acceptJSON: boolean = true): value is t.RGXToken {
    if (!isRGXToken(value, null, true, acceptJSON)) return false;

    try {
        return isSingletonRegexSource(resolveRGXToken(value));
    } catch (err) {
        // Tokens that can't be resolved on their own (such as unbalanced interpolations) aren't singletons.
        if (err instanceof e.RGXError) return false;

        // This is ignored because I don't know what kind of
        // unexpected errors might happen.
        /* istanbul ignore next */
        throw err;
    }
}

export function assertRGXSingletonToken(value: unknown, acceptJSON: boolean = true): asserts value is t.RGXToken {
    if (!isRGXSingletonToken(value, acceptJSON)) {
        throw new e.RGXInvalidTokenError("Invalid singleton token", { type: "custom", values: ["token that resolves to a singleton"] }, value);
    }
}

export function isValidRegexString(value: string): value is t.ValidRegexString {
    try {
        new RegExp(value);
        return true;
    } catch (e) {
        if (e instanceof SyntaxError) {
            return false;
        }

        // This is ignored because I don't know what kind of
        // unexpected errors might happen.
        /* istanbul ignore next */
        throw e;
    }
}

export function assertValidRegexString(value: string): asserts value is t.ValidRegexString {
    if (!isValidRegexString(value)) {
        try {
            new RegExp(value);
        } catch (err) {
            if (err instanceof SyntaxError) {
                throw new e.RGXInvalidRegexStringError("Invalid regex string", value, err);
            }

            // This is ignored because I don't know what kind of
            // unexpected errors might happen.
            /* istanbul ignore next */
            throw err;
        }
    }
}

export function castValidRegexString(value: string): t.ValidRegexString {
    assertValidRegexString(value);
    return value;
}

export function isValidVanillaRegexFlags(value: string): value is t.ValidVanillaRegexFlags {
    const patternMatch = /^[gimsuydv]*$/.test(value);
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

export function castValidVanillaRegexFlags(value: string): t.ValidVanillaRegexFlags {
    assertValidVanillaRegexFlags(value);
    return value;
}

export function isValidIdentifier(value: string): value is t.ValidIdentifier {
    // This regex checks for valid JavaScript identifiers, which can be used for named capture groups.
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
}

export function assertValidIdentifier(value: string): asserts value is t.ValidIdentifier {
    if (!isValidIdentifier(value)) {
        throw new e.RGXInvalidIdentifierError("Invalid identifier", value);
    }
}

export function castValidIdentifier(value: string): t.ValidIdentifier {
    assertValidIdentifier(value);
    return value;
}

export function isValidRegexLocalizableFlagDiff(value: string): value is t.ValidRegexLocalizableFlagDiff {
    if (value === '') return true;
    return /^[ims]+(-[ims]+)?$/.test(value);
}

export function assertValidRegexLocalizableFlagDiff(value: string): asserts value is t.ValidRegexLocalizableFlagDiff {
    if (!isValidRegexLocalizableFlagDiff(value)) {
        throw new e.RGXInvalidRegexLocalizableFlagDiffError("Invalid localizable flag diff", value);
    }
}

export function castValidRegexLocalizableFlagDiff(value: string): t.ValidRegexLocalizableFlagDiff {
    assertValidRegexLocalizableFlagDiff(value);
    return value;
}

export function isValidRegexLocalizableFlags(value: string): value is t.ValidRegexLocalizableFlags {
    return /^[ims]*$/.test(value);
}

export function assertValidRegexLocalizableFlags(value: string): asserts value is t.ValidRegexLocalizableFlags {
    if (!isValidRegexLocalizableFlags(value)) {
        throw new e.RGXInvalidRegexLocalizableFlagsError("Invalid localizable flags", value);
    }
}

export function castValidRegexLocalizableFlags(value: string): t.ValidRegexLocalizableFlags {
    assertValidRegexLocalizableFlags(value);
    return value;
}