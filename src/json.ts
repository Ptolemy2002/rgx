import * as t from "./types";
import * as e from "./errors";
import * as tg from "./typeGuards";
import { RGXClassToken, toRGXClassToken } from "./class";
import { RGXTokenCollection } from "./collection";
import { ExtRegExp, extractVanillaRegexFlags } from "./ExtRegExp";
import { resolveRGXToken } from "./resolve";

export type RGXJSONClassArgsValidator = (args: t.RGXJSONValue[]) => boolean | string;
export type RGXJSONClassConstructor = (args: t.RGXJSONValue[]) => RGXClassToken;
export type RGXJSONClassRegistryEntry = {
    validateArgs: RGXJSONClassArgsValidator;
    construct: RGXJSONClassConstructor;
};

// The shape every RGXClassToken subclass is expected to have on its static side.
export type RGXJSONClassTokenConstructor = {
    validateJSONArgs: RGXJSONClassArgsValidator;
    fromJSON: (json: t.RGXJSONClassToken) => RGXClassToken;
};

export type RGXJSONBuiltinClassName =
    "RGXClassWrapperToken" | "RGXClassUnionToken" | "RGXGroupToken" | "RGXRepeatToken" |
    "RGXLookaheadToken" | "RGXLookbehindToken" | "RGXExclusionToken" | "RGXSubpatternToken";
export type RGXJSONClassName = RGXJSONBuiltinClassName | (string & {});

export type RGXTokenToJSONOptions = {
    resolveConvertible?: boolean;
};

// Each class stores the entry it was registered with alongside a guarded copy whose construct validates
// its args first. Only the guarded copy is ever handed out, so callers outside this module cannot reach a
// construct function that trusts its args. See PENDING_BREAKING_CHANGES.md for why this is a workaround.
type RGXJSONClassRegistryRecord = {
    raw: RGXJSONClassRegistryEntry;
    guarded: RGXJSONClassRegistryEntry;
};

const rgxJSONClasses: Record<string, RGXJSONClassRegistryRecord> = {};

// Maps args arrays that have already passed the validator of the class they are mapped to and are currently
// being constructed. rgxJSONClassArgs uses this to skip validating them a second time.
const validatedRGXJSONClassArgs = new WeakMap<t.RGXJSONValue[], string>();

function constructValidatedRGXJSONClass(name: RGXJSONClassName, raw: RGXJSONClassRegistryEntry, args: t.RGXJSONValue[]): RGXClassToken {
    validatedRGXJSONClassArgs.set(args, name);
    try {
        return raw.construct(args);
    } finally {
        validatedRGXJSONClassArgs.delete(args);
    }
}

function getRGXJSONClassRecord(name: RGXJSONClassName): RGXJSONClassRegistryRecord {
    assertHasRGXJSONClass(name);
    return rgxJSONClasses[name]!;
}

// ------------------ Registry ------------------
export function listRGXJSONClasses(): string[] {
    return Object.keys(rgxJSONClasses);
}

export function hasRGXJSONClass(name: RGXJSONClassName): boolean {
    return name in rgxJSONClasses;
}

export function assertHasRGXJSONClass(name: RGXJSONClassName) {
    if (!hasRGXJSONClass(name)) {
        throw new e.RGXInvalidJSONClassKeyError("JSON class with name not registered.", name);
    }
}

export function assertNotHasRGXJSONClass(name: RGXJSONClassName) {
    if (hasRGXJSONClass(name)) {
        throw new e.RGXJSONClassConflictError("JSON class with name already registered.", name);
    }
}

export function registerRGXJSONClass(name: RGXJSONClassName, entry: RGXJSONClassRegistryEntry): RGXJSONClassRegistryEntry {
    assertNotHasRGXJSONClass(name);

    // Copied so that later changes to the given entry cannot bypass the guard.
    const raw: RGXJSONClassRegistryEntry = { validateArgs: entry.validateArgs, construct: entry.construct };
    const guarded: RGXJSONClassRegistryEntry = Object.freeze({
        validateArgs: raw.validateArgs,
        construct: (args: t.RGXJSONValue[]) => {
            assertValidRGXJSONClassArgs(name, args);
            return constructValidatedRGXJSONClass(name, raw, args);
        }
    });

    rgxJSONClasses[name] = { raw, guarded };
    return guarded;
}

export function registerRGXJSONClassToken(name: RGXJSONClassName, constructor: RGXJSONClassTokenConstructor): RGXJSONClassRegistryEntry {
    return registerRGXJSONClass(name, {
        validateArgs: args => constructor.validateJSONArgs(args),
        construct: args => constructor.fromJSON(createRGXJSONClassToken(name, args))
    });
}

export function getRGXJSONClass(name: RGXJSONClassName): RGXJSONClassRegistryEntry {
    return getRGXJSONClassRecord(name).guarded;
}

export function unregisterRGXJSONClass(name: RGXJSONClassName) {
    assertHasRGXJSONClass(name);
    delete rgxJSONClasses[name];
}

export function validateRGXJSONClassArgs(name: RGXJSONClassName, args: t.RGXJSONValue[]): true | string {
    const result = getRGXJSONClassRecord(name).raw.validateArgs(args);
    if (result === true) return true;
    if (result === false) return "Argument validation failed.";
    return result;
}

export function assertValidRGXJSONClassArgs(name: RGXJSONClassName, args: t.RGXJSONValue[]) {
    const result = validateRGXJSONClassArgs(name, args);
    if (result !== true) throw new e.RGXJSONClassArgsValidationFailedError(name, args, result);
}

// ------------------ Helpers for class token implementations ------------------
export function createRGXJSONClassToken(name: RGXJSONClassName, args: t.RGXJSONValue[] = []): t.RGXJSONClassToken {
    return { [t.RGX_JSON_FLAG]: true, class: name, args };
}

export function createRGXJSONLiteralToken(source: string, flags: string = ''): t.RGXJSONLiteralToken {
    tg.assertValidRegexString(source);
    if (flags === '') return { [t.RGX_JSON_FLAG]: true, source };
    return { [t.RGX_JSON_FLAG]: true, source, flags };
}

export function assertRGXJSONClassTokenOf(json: unknown, name: RGXJSONClassName): asserts json is t.RGXJSONClassToken {
    tg.assertRGXJSONClassToken(json, false);
    if (json.class !== name) {
        throw new e.RGXInvalidJSONTokenError("JSON class token is for a different class", { type: "custom", values: [`JSON class token with class ${JSON.stringify(name)}`] }, json);
    }
}

// Extracts the args from a JSON class token after checking that it targets the given class and that
// its args pass the given validator. Throws RGXJSONClassArgsValidationFailedError if validation fails.
export function rgxJSONClassArgs(json: unknown, name: RGXJSONClassName, validate: RGXJSONClassArgsValidator): t.RGXJSONValue[] {
    assertRGXJSONClassTokenOf(json, name);
    const args = json.args ?? [];

    // The registry already validated these args against this class before constructing.
    if (validatedRGXJSONClassArgs.get(args) === name) return args;

    const result = validate(args);
    if (result === true) return args;
    throw new e.RGXJSONClassArgsValidationFailedError(name, args, result === false ? "Argument validation failed." : result);
}

// ------------------ Conversion ------------------
export function rgxTokenToJSON(token: t.RGXToken, { resolveConvertible = true }: RGXTokenToJSONOptions = {}): t.RGXJSONToken {
    if (tg.isRGXNoOpToken(token)) return null;

    if (tg.isRGXNativeToken(token)) {
        if (typeof token === "number" && !Number.isFinite(token)) {
            throw new e.RGXNotJSONSerializableError("Cannot convert token to JSON", token, "Non-finite numbers are not JSON-serializable.");
        }
        return token;
    }

    if (tg.isRGXLiteralToken(token)) {
        // The source of an ExtRegExp already has any custom flag transformations applied,
        // so only the vanilla flags are kept to avoid applying the transformations twice.
        return createRGXJSONLiteralToken(token.source, extractVanillaRegexFlags(token.flags));
    }

    if (tg.isRGXJSONObjectToken(token, false)) {
        tg.assertRGXJSONObjectToken(token);
        return token;
    }

    if (RGXClassToken.check(token) && token.toJSON !== RGXClassToken.prototype.toJSON) return token.toJSON();
    if (RGXTokenCollection.check(token)) return toRGXClassToken(token).toJSON();

    // Class tokens without a custom toJSON fall through to here, since they are also convertible tokens.
    if (tg.isRGXConvertibleToken(token, false)) {
        if (!resolveConvertible) {
            throw new e.RGXNotJSONSerializableError("Cannot convert token to JSON", token, "Convertible tokens that are not class tokens with a custom toJSON method can only be converted by resolving them, but resolveConvertible is false.");
        }

        return createRGXJSONLiteralToken(resolveRGXToken(token, { groupWrap: false }));
    }

    if (tg.isRGXArrayToken(token, false)) {
        return token.map(item => rgxTokenToJSON(item, { resolveConvertible }));
    }

    // Ignoring this line since it should be impossible to reach if the types are correct.
    /* istanbul ignore next */
    throw new e.RGXInvalidTokenError("Invalid RGX token", null, token);
}

export function rgxTokenFromJSON(json: t.RGXJSONToken): t.RGXNonJSONToken {
    if (tg.isRGXJSONNativeToken(json)) return json;

    if (tg.isRGXJSONLiteralToken(json, false)) {
        tg.assertRGXJSONLiteralToken(json);
        return new ExtRegExp(json.source, json.flags ?? '');
    }

    if (tg.isRGXJSONClassToken(json, false)) {
        // The guarded construct validates the args before constructing.
        return getRGXJSONClass(json.class).construct(json.args ?? []);
    }

    if (Array.isArray(json)) return json.map(item => rgxTokenFromJSON(item));

    throw new e.RGXInvalidJSONTokenError("Invalid RGX JSON token", { type: "tokenType", values: ["json"] }, json);
}

export function rgxTokenToJSONString(token: t.RGXToken, options: RGXTokenToJSONOptions = {}, space?: string | number): string {
    return JSON.stringify(rgxTokenToJSON(token, options), null, space);
}

export function rgxTokenFromJSONString(json: string): t.RGXNonJSONToken {
    let parsed: unknown;
    try {
        parsed = JSON.parse(json);
    } catch (err) {
        if (err instanceof SyntaxError) {
            throw new e.RGXInvalidJSONTokenError(`Invalid JSON string: ${err.message}`, { type: "tokenType", values: ["json"] }, json);
        }

        // This is ignored because I don't know what kind of
        // unexpected errors might happen.
        /* istanbul ignore next */
        throw err;
    }

    tg.assertRGXJSONToken(parsed, false);
    return rgxTokenFromJSON(parsed);
}
