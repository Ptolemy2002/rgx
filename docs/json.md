# Type Reference
The following is a reference to types relevant to the components listed in this file. The full type reference for the library can be found in [type-reference.md](./type-reference.md).

```typescript
type RGXNoOpToken = null | undefined;
type RGXLiteralToken = RegExp;
type RGXNativeToken = string | number | boolean | RGXNoOpToken;
type RGXConvertibleToken = {
    toRgx: () => RGXToken,
    rgxAcceptInsertion?: (tokens: RGXToken[], flags: ValidRegexFlags) => string | boolean,
    readonly rgxGroupWrap?: boolean,
    readonly rgxIsGroup?: boolean,
    readonly rgxIsRepeatable?: boolean,
    readonly rgxInterpolate?: boolean
};
type RGXJSONPrimitive = string | number | boolean | null;
type RGXJSONObject = { [key: string]: RGXJSONValue | undefined };
type RGXJSONValue = RGXJSONPrimitive | RGXJSONValue[] | RGXJSONObject;
type RGXJSONNativeToken = Exclude<RGXNativeToken, undefined>;
type RGXJSONLiteralToken = { $rgx: true, source: string, flags?: string };
type RGXJSONClassToken = { $rgx: true, class: string, args?: RGXJSONValue[] };
type RGXJSONObjectToken = RGXJSONLiteralToken | RGXJSONClassToken;
type RGXJSONToken = RGXJSONNativeToken | RGXJSONObjectToken | RGXJSONToken[];
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXJSONObjectToken | RGXToken[];
type RGXNonJSONToken = Exclude<RGXToken, RGXJSONObjectToken>;
const RGX_JSON_FLAG = "$rgx";
type RGXJSONFlag = typeof RGX_JSON_FLAG;

type RGXJSONClassArgsValidator = (args: RGXJSONValue[]) => boolean | string;
type RGXJSONClassConstructor = (args: RGXJSONValue[]) => RGXClassToken;
type RGXJSONClassRegistryEntry = {
    validateArgs: RGXJSONClassArgsValidator;
    construct: RGXJSONClassConstructor;
};
type RGXJSONClassTokenConstructor = {
    validateJSONArgs: RGXJSONClassArgsValidator;
    fromJSON: (json: RGXJSONClassToken) => RGXClassToken;
};
type RGXJSONBuiltinClassName =
    "RGXClassWrapperToken" | "RGXClassUnionToken" | "RGXGroupToken" | "RGXRepeatToken" |
    "RGXLookaheadToken" | "RGXLookbehindToken" | "RGXExclusionToken" | "RGXSubpatternToken";
type RGXJSONClassName = RGXJSONBuiltinClassName | (string & {});
type RGXTokenToJSONOptions = {
    resolveConvertible?: boolean;
};
```

# JSON Tokens
A JSON token is a token that is guaranteed to survive `JSON.stringify` and `JSON.parse` without loss, so patterns can be stored in files, sent over the network, or embedded in configuration. Every JSON token is also a regular `RGXToken`, so it can be given directly to `rgx`, `rgxa`, `resolveRGXToken`, `rgxConcat`, class token constructors, walkers, lexers, and so on without converting it first. There are three forms:

- **JSON native tokens** (`RGXJSONNativeToken`): any native token except `undefined`, i.e. a string, a finite number, a boolean, or `null`. These behave exactly like the native tokens they are.
- **JSON object tokens** (`RGXJSONObjectToken`): plain objects with the flag property `$rgx` set to `true` (the key is exported as `RGX_JSON_FLAG`). The flag signals the intent to be an RGX token, and the remaining keys describe one of two things:
  - A **JSON literal token** (`RGXJSONLiteralToken`) has a `source` string and an optional `flags` string, and describes the `ExtRegExp` created by `new ExtRegExp(source, flags)`. Since `ExtRegExp` behaves exactly like `RegExp`, this is enough to describe any literal token.
  - A **JSON class token** (`RGXJSONClassToken`) has a `class` name and an optional `args` array of JSON values, and describes the class token produced by giving `args` to the constructor registered under `class` in the JSON class registry (see below).
- **Arrays of JSON tokens**, which behave like any other array token (a union).

When a JSON object token is encountered by the resolver, by `toRGXClassToken`, by `RGXClassWrapperToken`, or by the type guards, it is converted with `rgxTokenFromJSON` on the fly. Invalid JSON object tokens (a `source` that does not compile, an unregistered `class`, or `args` rejected by the class' validator) throw the corresponding error at that point.

Every built-in `RGXClassToken` subclass implements `toJSON()`, which returns its JSON class token form, and the static methods `validateJSONArgs(args)` and `fromJSON(json)`, which validate and consume that form. Custom subclasses should do the same; the base implementations throw `RGXNotImplementedError`. Because the method is named `toJSON`, calling `JSON.stringify` on a class token produces its JSON form automatically. See [base.md](./class/token/base.md) for the contract and the individual token class docs for each class' argument layout.

```typescript
const token = rgxConstant("digit").repeat(1, 3).group({ name: "num" });
const json = rgxTokenToJSON(token);
// {
//     $rgx: true, class: "RGXGroupToken",
//     args: [{ name: "num", capturing: true, flags: "" }, [
//         { $rgx: true, class: "RGXRepeatToken", args: [
//             { $rgx: true, class: "RGXGroupToken", args: [{ name: null, capturing: false, flags: "" }, [
//                 { $rgx: true, class: "RGXClassWrapperToken", args: [{ $rgx: true, source: "\\d" }] }
//             ]] },
//             1, 3, false
//         ] }
//     ]]
// }

const restored = JSON.parse(JSON.stringify(json));
rgxa(["id-", restored]); // JSON tokens can be used directly
rgxTokenFromJSON(restored); // or converted back into an RGXGroupToken
```

# Conversion Functions
## rgxTokenToJSON
```typescript
function rgxTokenToJSON(token: RGXToken, options?: RGXTokenToJSONOptions): RGXJSONToken
```
Converts any `RGXToken` into a JSON token. The conversion is by token type:
- No-op tokens (`null` and `undefined`) become `null`.
- Native tokens are returned as-is. Non-finite numbers (`NaN`, `Infinity`) throw `RGXNotJSONSerializableError`, since `JSON.stringify` would turn them into `null`.
- Literal tokens become JSON literal tokens with the regex's `source` and its vanilla flags (`flags` is omitted when empty). Custom `ExtRegExp` flags are dropped because the `source` of an `ExtRegExp` already has their transformations applied, so keeping them would apply the transformations twice when converting back. The converted token behaves identically.
- JSON object tokens are validated (`assertRGXJSONObjectToken`) and returned as-is.
- Class tokens are converted with their `toJSON()` method.
- `RGXTokenCollection` instances are converted via `toRGXClassToken` (an `RGXClassUnionToken` for union mode, a non-capturing `RGXGroupToken` for concat mode) and then with `toJSON()`.
- Any other convertible token cannot be reconstructed from JSON, so when `resolveConvertible` is `true` (the default) it is resolved with `resolveRGXToken(token, { groupWrap: false })` into a JSON literal token. This is lossy: `rgxGroupWrap`, `rgxIsRepeatable`, `rgxIsGroup`, `rgxInterpolate`, and `rgxAcceptInsertion` preferences are not preserved, and the resolved string may be wrapped in an extra non-capturing group once used, though the matching behavior is the same. When `resolveConvertible` is `false`, an `RGXNotJSONSerializableError` is thrown instead.
- Arrays are converted element-wise (with the same options).

## Parameters
  - `token` (`RGXToken`): The token to convert.
  - `options` (`RGXTokenToJSONOptions`, optional): An object containing optional configuration.
    - `resolveConvertible` (`boolean`, optional): Whether plain convertible tokens (ones that are neither class tokens nor collections) are resolved into JSON literal tokens. Defaults to `true`. When `false`, encountering one throws `RGXNotJSONSerializableError`.

## Returns
- `RGXJSONToken`: The JSON token. Passing it through `JSON.stringify` and `JSON.parse` yields an equal value.

## rgxTokenFromJSON
```typescript
function rgxTokenFromJSON(json: RGXJSONToken): RGXNonJSONToken
```
Converts a JSON token into its runtime equivalent. JSON native tokens are returned as-is, JSON literal tokens become `ExtRegExp` instances (constructed with their `source` and `flags`), JSON class tokens become the class token produced by the registered constructor for their `class` (after the class' argument validator accepts their `args`, defaulting to `[]`), and arrays are converted element-wise.

Throws `RGXInvalidJSONTokenError` if `json` is not a JSON token or a JSON literal token's content is invalid, `RGXInvalidJSONClassKeyError` if a JSON class token names an unregistered class, and `RGXJSONClassArgsValidationFailedError` if its `args` are rejected.

## Parameters
  - `json` (`RGXJSONToken`): The JSON token to convert.

## Returns
- `RGXNonJSONToken`: The converted token, which contains no JSON object tokens at the top level.

## rgxTokenToJSONString
```typescript
function rgxTokenToJSONString(token: RGXToken, options?: RGXTokenToJSONOptions, space?: string | number): string
```
A convenience wrapper that calls `rgxTokenToJSON` and then `JSON.stringify` on the result.

## Parameters
  - `token` (`RGXToken`): The token to convert.
  - `options` (`RGXTokenToJSONOptions`, optional): Passed to `rgxTokenToJSON`. Defaults to `{}`.
  - `space` (`string | number`, optional): Passed to `JSON.stringify` as its `space` argument for pretty printing. Omitted by default.

## Returns
- `string`: The JSON string.

## rgxTokenFromJSONString
```typescript
function rgxTokenFromJSONString(json: string): RGXNonJSONToken
```
A convenience wrapper that parses `json` with `JSON.parse`, asserts that the result is structurally a JSON token (`assertRGXJSONToken(parsed, false)`), and then calls `rgxTokenFromJSON` on it. Throws `RGXInvalidJSONTokenError` if the string is not valid JSON or does not describe a JSON token.

## Parameters
  - `json` (`string`): The JSON string to parse.

## Returns
- `RGXNonJSONToken`: The converted token.

# JSON Class Registry
JSON class tokens name their target class with a string, so a registry maps those names to an argument validator and a constructor. The built-in token classes are registered under their class names (listed in `RGXJSONBuiltinClassName`) by `rgxClassInit`, which runs when the main entry point is imported. Custom `RGXClassToken` subclasses can be registered by callers so that their JSON forms can be converted too.

```typescript
class MyToken extends RGXClassToken {
    constructor(public value: string) { super(); }
    toRgx() { return this.value; }
    clone() { return new MyToken(this.value); }

    static validateJSONArgs(args: RGXJSONValue[]): boolean | string {
        if (args.length !== 1) return "Expected exactly 1 argument.";
        if (typeof args[0] !== "string") return "Argument 0 (value) must be a string.";
        return true;
    }

    static fromJSON(json: RGXJSONClassToken): MyToken {
        const [value] = rgxJSONClassArgs(json, "MyToken", MyToken.validateJSONArgs) as [string];
        return new MyToken(value);
    }

    toJSON() {
        return createRGXJSONClassToken("MyToken", [this.value]);
    }
}

registerRGXJSONClassToken("MyToken", MyToken);
rgxTokenFromJSON({ $rgx: true, class: "MyToken", args: ["abc"] }); // MyToken { value: "abc" }
```

## registerRGXJSONClass
```typescript
function registerRGXJSONClass(name: RGXJSONClassName, entry: RGXJSONClassRegistryEntry): RGXJSONClassRegistryEntry
```
Registers a validator and constructor pair under `name`. Throws `RGXJSONClassConflictError` if `name` is already registered. Returns `entry`.

## Parameters
  - `name` (`RGXJSONClassName`): The class name that JSON class tokens will use in their `class` property.
  - `entry` (`RGXJSONClassRegistryEntry`): The registry entry.
    - `validateArgs` (`RGXJSONClassArgsValidator`): Receives the `args` of a JSON class token (defaulting to `[]`) and returns `true` if they are acceptable, or `false`/a reason string if not.
    - `construct` (`RGXJSONClassConstructor`): Receives the validated `args` and returns the class token. Nested JSON tokens within `args` are not converted automatically; use `rgxTokenFromJSON` within `construct` as needed.

## registerRGXJSONClassToken
```typescript
function registerRGXJSONClassToken(name: RGXJSONClassName, constructor: RGXJSONClassTokenConstructor): RGXJSONClassRegistryEntry
```
A convenience wrapper around `registerRGXJSONClass` for `RGXClassToken` subclasses that implement the static `validateJSONArgs` and `fromJSON` methods. The resulting entry validates with `constructor.validateJSONArgs(args)` and constructs with `constructor.fromJSON(createRGXJSONClassToken(name, args))`. Throws `RGXJSONClassConflictError` if `name` is already registered.

## Parameters
  - `name` (`RGXJSONClassName`): The class name to register under. This must match the name the class uses in its `toJSON()` and `fromJSON()` implementations.
  - `constructor` (`RGXJSONClassTokenConstructor`): The class (or any object with `validateJSONArgs` and `fromJSON`).

## registerBuiltinRGXJSONClasses
```typescript
function registerBuiltinRGXJSONClasses(): void
```
Registers every class in `RGX_BUILTIN_JSON_CLASSES` (a record mapping each `RGXJSONBuiltinClassName` to its class) that is not already registered. Called by `rgxClassInit`, so it is safe to call more than once and normally does not need to be called manually. If a built-in name was unregistered with `unregisterRGXJSONClass`, calling this re-registers it.

## unregisterRGXJSONClass
```typescript
function unregisterRGXJSONClass(name: RGXJSONClassName): void
```
Removes the entry registered under `name`. Throws `RGXInvalidJSONClassKeyError` if `name` is not registered.

## hasRGXJSONClass
```typescript
function hasRGXJSONClass(name: RGXJSONClassName): boolean
```
Returns whether an entry is registered under `name`.

## assertHasRGXJSONClass
```typescript
function assertHasRGXJSONClass(name: RGXJSONClassName): void
```
Throws `RGXInvalidJSONClassKeyError` if `name` is not registered.

## assertNotHasRGXJSONClass
```typescript
function assertNotHasRGXJSONClass(name: RGXJSONClassName): void
```
Throws `RGXJSONClassConflictError` if `name` is registered.

## getRGXJSONClass
```typescript
function getRGXJSONClass(name: RGXJSONClassName): RGXJSONClassRegistryEntry
```
Returns the entry registered under `name`. Throws `RGXInvalidJSONClassKeyError` if `name` is not registered.

## listRGXJSONClasses
```typescript
function listRGXJSONClasses(): string[]
```
Returns the names of all registered classes.

## validateRGXJSONClassArgs
```typescript
function validateRGXJSONClassArgs(name: RGXJSONClassName, args: RGXJSONValue[]): true | string
```
Runs the validator registered under `name` on `args` and normalizes the result: `true` stays `true`, a reason string is returned as-is, and `false` becomes the string `"Argument validation failed."`. Throws `RGXInvalidJSONClassKeyError` if `name` is not registered.

## assertValidRGXJSONClassArgs
```typescript
function assertValidRGXJSONClassArgs(name: RGXJSONClassName, args: RGXJSONValue[]): void
```
Throws `RGXJSONClassArgsValidationFailedError` (with the normalized reason from `validateRGXJSONClassArgs`) if the validator registered under `name` rejects `args`. Throws `RGXInvalidJSONClassKeyError` if `name` is not registered.

# Helpers for Class Token Implementations
These functions are intended for use inside `toJSON()` and `fromJSON()` implementations.

## createRGXJSONClassToken
```typescript
function createRGXJSONClassToken(name: RGXJSONClassName, args?: RGXJSONValue[]): RGXJSONClassToken
```
Returns `{ $rgx: true, class: name, args }`. `args` defaults to `[]`. No validation is performed.

## createRGXJSONLiteralToken
```typescript
function createRGXJSONLiteralToken(source: string, flags?: string): RGXJSONLiteralToken
```
Returns `{ $rgx: true, source }` when `flags` is empty (the default), otherwise `{ $rgx: true, source, flags }`. Throws `RGXInvalidRegexStringError` if `source` is not a valid regex string.

## assertRGXJSONClassTokenOf
```typescript
function assertRGXJSONClassTokenOf(json: unknown, name: RGXJSONClassName): asserts json is RGXJSONClassToken
```
Asserts that `json` is structurally a JSON class token (`assertRGXJSONClassToken(json, false)`) and that its `class` is `name`. Throws `RGXInvalidJSONTokenError` otherwise.

## rgxJSONClassArgs
```typescript
function rgxJSONClassArgs(json: unknown, name: RGXJSONClassName, validate: RGXJSONClassArgsValidator): RGXJSONValue[]
```
The one-stop helper for `fromJSON` implementations. Asserts with `assertRGXJSONClassTokenOf(json, name)`, runs `validate` on `json.args` (defaulting to `[]`), and returns the args. Throws `RGXJSONClassArgsValidationFailedError` if `validate` returns `false` or a reason string.

## Parameters
  - `json` (`unknown`): The JSON class token.
  - `name` (`RGXJSONClassName`): The class name `json` must target.
  - `validate` (`RGXJSONClassArgsValidator`): The validator to run, typically the class' own `validateJSONArgs`.

## Returns
- `RGXJSONValue[]`: The validated arguments, ready to be converted (with `rgxTokenFromJSON` where they are tokens) and passed to the constructor.
