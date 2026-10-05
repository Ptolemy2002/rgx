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

type RGXClassTokenConstructor = new (...args: unknown[]) => RGXClassToken;
type RGXGroupedToken = RGXToken[] | RGXLiteralToken | RGXGroupedConvertibleToken | RGXJSONObjectToken;
type RGXGroupedConvertibleToken = (RGXConvertibleToken & { readonly rgxIsGroup: true }) | (Omit<RGXConvertibleToken, "toRgx"> & { toRgx: () => RGXGroupedToken, readonly rgxGroupWrap: true  });
type RGXRepeatableConvertibleToken = RGXConvertibleToken & { readonly rgxIsRepeatable: true | undefined };

type RGXTokenType = 'no-op' | 'literal' | 'native' | 'convertible' | 'class' | 'json' | RGXTokenType[];
type RGXTokenTypeFlat = Exclude<RGXTokenType, RGXTokenType[]> | "array";
type RGXTokenTypeGuardInput = 
    // A union of all possible inputs that can be used to specify token types in type guards, including:
    // - The string literals corresponding to the basic token types, e.g. 'no-op', 'literal', etc.
    // - null, which can be used to indicate any token type
    // - Constructors for class tokens
    // - The RegExp and ExtRegExp constructors, which can be used to indicate literal tokens
    // - RGXTokenCollection, which can be used to indicate arrays of tokens
    // - "repeatable", which can be used to indicate any token that is repeatable (i.e. has rgxIsRepeatable true or does not specify rgxIsRepeatable)
    // - "json", which can be used to indicate any JSON token (native, JSON object token, or array of JSON tokens)
    // - Arrays of any of the above, allowing for nested token type specifications
;

type RGXTokenFromType<T extends RGXTokenTypeGuardInput, J extends boolean = true> =
    // Maps token type strings to their corresponding types, e.g.:
    // 'no-op' -> RGXNoOpToken, 'literal' -> RGXLiteralToken, 'json' -> RGXJSONToken, etc.
    // Also maps any constructor to InstanceType<T>,
    // and preserves tuple types for constant arrays.
    // When J (whether JSON tokens are accepted) is true, the JSON counterpart is included
    // where one exists, e.g. 'literal' -> RGXLiteralToken | RGXJSONLiteralToken,
    // 'class' -> RGXClassToken | RGXJSONClassToken, and constructors -> InstanceType<T> | RGXJSONClassToken.
    // ... see source for full definition
;

type RGXErrorCode =
    // A series of string literals representing the codes
    // an RGXError can have, e.g. "INVALID_TOKEN_TYPE",
    // "INVALID_REGEX_FLAGS", etc. See src/errors/base.ts
    // for the full list of error codes.
;
```

# Type Guards
There are many type guards provided in the library, with most having both an `is` and `assert` version, where the `assert` version throws an appropriate `RGXError` instance. Each type guard is set up to narrow the type of a value when using TypeScript.

## isRGXNoOpToken
```typescript
function isRGXNoOpToken(value: unknown): value is RGXNoOpToken
```

Checks if the given value is a no-op token (`null` or `undefined`).

## assertRGXNoOpToken
```typescript
function assertRGXNoOpToken(value: unknown): asserts value is RGXNoOpToken
```

Asserts that the given value is a no-op token (`null` or `undefined`). If the assertion fails, an `RGXInvalidTokenError` will be thrown.

## isRGXLiteralToken
```typescript
function isRGXLiteralToken(value: unknown): value is RGXLiteralToken
```

Checks if the given value is a literal token (a `RegExp` object).

## assertRGXLiteralToken
```typescript
function assertRGXLiteralToken(value: unknown): asserts value is RGXLiteralToken
```

Asserts that the given value is a literal token (a `RegExp` object). If the assertion fails, an `RGXInvalidTokenError` will be thrown.

## isRGXNativeToken
```typescript
function isRGXNativeToken(value: unknown): value is RGXNativeToken
```

Checks if the given value is a native token (string, number, boolean, or no-op).

## assertRGXNativeToken
```typescript
function assertRGXNativeToken(value: unknown): asserts value is RGXNativeToken
```

Asserts that the given value is a native token (string, number, boolean, or no-op). If the assertion fails, an `RGXInvalidTokenError` will be thrown.

## isRGXConvertibleToken
```typescript
function isRGXConvertibleToken(value: unknown, returnCheck?: boolean, acceptJSON?: boolean): value is RGXConvertibleToken
```
Checks if the given value is a convertible token (an object with a `toRgx` method). If the `rgxGroupWrap`, `rgxIsRepeatable`, or `rgxIsGroup` properties are present, they must be booleans; otherwise, the check fails. If the `rgxAcceptInsertion` property is present, it must be a callable that returns a `string` or `boolean`; otherwise, the check fails. Validates that `toRgx` is callable and returns a valid `RGXToken` (which can be any RGX token type, including other convertible tokens, allowing for recursive structures). When `returnCheck` is `false`, only checks for the presence and callability of function properties instead of also checking their return values.

Note that JSON object tokens are never themselves convertible tokens, even though they may describe a class token. `acceptJSON` only controls whether a `toRgx` return value containing JSON object tokens is accepted.

### Parameters
  - `value` (`unknown`): The value to check.
  - `returnCheck` (`boolean`, optional): Whether to validate the return value of the `toRgx` method. Defaults to `true`. When `false`, only checks that `toRgx` exists and is callable. **Note**: Setting this to `false` makes the type guard assertion strictly unsafe, as it doesn't verify that the methods actually return valid values. However, depending on the type of the value you're checking, you might not need that safety (e.g., when checking values that you know are valid based on other context).
  - `acceptJSON` (`boolean`, optional): Whether JSON object tokens (see [json.md](./json.md)) are accepted as valid tokens in the `toRgx` return value (including nested within arrays or other convertible tokens). Defaults to `true`.

## assertRGXConvertibleToken
```typescript
function assertRGXConvertibleToken(value: unknown, returnCheck?: boolean, acceptJSON?: boolean): asserts value is RGXConvertibleToken
```
Asserts that the given value is a convertible token (an object with a `toRgx` method) with the same logic as `isRGXConvertibleToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

## isRGXArrayToken
```typescript
function isRGXArrayToken(value: unknown, contentCheck?: boolean, acceptJSON?: boolean): value is RGXToken[]
```
Checks if the given value is an array of RGX tokens. When `contentCheck` is `true` (the default), validates that the value is an array and that every element is a valid RGX token (of any type, including nested arrays). When `contentCheck` is `false`, only checks that the value is an array without validating the contents.

### Parameters
  - `value` (`unknown`): The value to check.
  - `contentCheck` (`boolean`, optional): Whether to validate that every element is a valid RGX token. Defaults to `true`. When `false`, only checks that the value is an array. **Note**: Setting this to `false` makes the type guard assertion strictly unsafe, as it doesn't verify that the array elements are actually valid `RGXToken` values. However, depending on the context, you might not need that safety (e.g., when checking arrays that you know are valid based on other validation).
  - `acceptJSON` (`boolean`, optional): Whether JSON object tokens (see [json.md](./json.md)) are accepted as valid elements (at any nesting depth). Defaults to `true`. Has no effect when `contentCheck` is `false`.

## assertRGXArrayToken
```typescript
function assertRGXArrayToken(value: unknown, contentCheck?: boolean, acceptJSON?: boolean): asserts value is RGXToken[]
```
Asserts that the given value is an array of RGX tokens with the same logic as `isRGXArrayToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

## isRGXJSONValue
```typescript
function isRGXJSONValue(value: unknown): value is RGXJSONValue
```
Checks if the given value is JSON-serializable without loss: `null`, a string, a boolean, a finite number, an array of JSON values, or a plain object (prototype `Object.prototype` or `null`) whose values are JSON values. Property values of `undefined` are allowed inside objects since `JSON.stringify` drops them. Class instances, `RegExp` objects, functions, symbols, BigInts, and non-finite numbers are rejected.

## assertRGXJSONValue
```typescript
function assertRGXJSONValue(value: unknown): asserts value is RGXJSONValue
```
Asserts that the given value is a JSON value with the same logic as `isRGXJSONValue`. If the assertion fails, an `RGXInvalidJSONTokenError` will be thrown.

## isRGXJSONNativeToken
```typescript
function isRGXJSONNativeToken(value: unknown): value is RGXJSONNativeToken
```
Checks if the given value is a JSON native token: a string, a boolean, a finite number, or `null`. Unlike `isRGXNativeToken`, `undefined` and non-finite numbers are rejected since they are not JSON-serializable.

## assertRGXJSONNativeToken
```typescript
function assertRGXJSONNativeToken(value: unknown): asserts value is RGXJSONNativeToken
```
Asserts that the given value is a JSON native token with the same logic as `isRGXJSONNativeToken`. If the assertion fails, an `RGXInvalidJSONTokenError` will be thrown.

## isRGXJSONLiteralToken
```typescript
function isRGXJSONLiteralToken(value: unknown, contentCheck?: boolean): value is RGXJSONLiteralToken
```
Checks if the given value is a JSON literal token: a plain object with `$rgx` set to `true`, a string `source` property, no `class` property, and an optional string `flags` property. When `contentCheck` is `true` (the default), additionally validates that `flags` is a valid `ExtRegExp` flag set (custom flags included) and that `source` compiles as a regex with the vanilla subset of those flags.

### Parameters
  - `value` (`unknown`): The value to check.
  - `contentCheck` (`boolean`, optional): Whether to validate the `source` and `flags` values. Defaults to `true`. When `false`, only the structure is checked.

## assertRGXJSONLiteralToken
```typescript
function assertRGXJSONLiteralToken(value: unknown, contentCheck?: boolean): asserts value is RGXJSONLiteralToken
```
Asserts that the given value is a JSON literal token with the same logic as `isRGXJSONLiteralToken`. If the assertion fails, an `RGXInvalidJSONTokenError` will be thrown.

## isRGXJSONClassToken
```typescript
function isRGXJSONClassToken(value: unknown, registryCheck?: boolean): value is RGXJSONClassToken
```
Checks if the given value is a JSON class token: a plain object with `$rgx` set to `true`, a string `class` property, no `source` property, and an optional `args` property that is an array of JSON values. When `registryCheck` is `true` (the default), additionally requires that `class` names a class registered in the JSON class registry (see [json.md](./json.md)) and that `args` (defaulting to `[]`) passes that class' argument validator.

### Parameters
  - `value` (`unknown`): The value to check.
  - `registryCheck` (`boolean`, optional): Whether to validate the class name against the registry and run its argument validator. Defaults to `true`. When `false`, only the structure is checked, so an unregistered class name is accepted.

## assertRGXJSONClassToken
```typescript
function assertRGXJSONClassToken(value: unknown, registryCheck?: boolean): asserts value is RGXJSONClassToken
```
Asserts that the given value is a JSON class token with the same logic as `isRGXJSONClassToken`. If the assertion fails, an `RGXInvalidJSONTokenError` will be thrown.

## isRGXJSONObjectToken
```typescript
function isRGXJSONObjectToken(value: unknown, contentCheck?: boolean): value is RGXJSONObjectToken
```
Checks if the given value is either a JSON literal token or a JSON class token. `contentCheck` is forwarded to `isRGXJSONLiteralToken` as `contentCheck` and to `isRGXJSONClassToken` as `registryCheck`. Defaults to `true`.

## assertRGXJSONObjectToken
```typescript
function assertRGXJSONObjectToken(value: unknown, contentCheck?: boolean): asserts value is RGXJSONObjectToken
```
Asserts that the given value is a JSON object token with the same logic as `isRGXJSONObjectToken`. If the assertion fails, an `RGXInvalidJSONTokenError` will be thrown.

## isRGXJSONToken
```typescript
function isRGXJSONToken(value: unknown, contentCheck?: boolean): value is RGXJSONToken
```
Checks if the given value is any JSON token: a JSON native token, a JSON object token, or an array of JSON tokens (nested to any depth). When `contentCheck` is `true` (the default), object tokens are validated with content/registry checks and array elements are checked recursively. When `false`, object tokens are only structurally checked and array contents are not checked at all.

## assertRGXJSONToken
```typescript
function assertRGXJSONToken(value: unknown, contentCheck?: boolean): asserts value is RGXJSONToken
```
Asserts that the given value is a JSON token with the same logic as `isRGXJSONToken`. If the assertion fails, an `RGXInvalidJSONTokenError` will be thrown.

## isRGXToken
```typescript
function isRGXToken<T extends RGXTokenTypeGuardInput = null, J extends boolean = true>(value: unknown, type?: T, matchLength?: boolean, acceptJSON?: J): value is RGXTokenFromType<T, J>
```

Checks if the given value is a valid RGX token, optionally narrowed to a specific token type. When `type` is `null` (the default), it checks against all token types. When `type` is a specific token type string, it checks only against that type. The `'class'` type matches `RGXClassToken` instances specifically, while `'convertible'` also matches class tokens since they implement the convertible interface.

When `type` is a constructor, it performs an `instanceof` check against that specific constructor, allowing you to narrow to a specific class token subclass rather than all class tokens. In this case, `RGXTokenFromType` resolves to `InstanceType<T>`, giving you the specific subclass type.

When `type` is an array, it checks that every element of the value array is a valid RGX token matching the corresponding type in the `type` array. If `matchLength` is `true` (the default), it also requires that the value array has the same length as the type array; if `false`, it allows the value array to be longer than the type array, as long as all elements up to the length of the type array match and all elements after that are still valid RGX tokens of any type.

When `type` is `"repeatable"`, it passes for any token that is not convertible, then checks if `rgxIsRepeatable` is `true | undefined` for convertible tokens.

When `type` is `"json"`, it passes for any JSON token (see `isRGXJSONToken`). This type is explicit, so `acceptJSON` has no effect on it.

When `acceptJSON` is `true` (the default), JSON object tokens (see [json.md](./json.md)) are accepted wherever their converted form would be: JSON literal tokens match `'literal'`, JSON class tokens match `'class'` and `'convertible'`, a JSON class token matches a constructor when the token it converts to is an instance of that constructor, and `"repeatable"` is checked against the converted token. Only JSON object tokens that would convert successfully are accepted (i.e. the literal content is valid and the class is registered with valid args). When `acceptJSON` is `false`, JSON object tokens are never accepted (except with the explicit `"json"` type), and `RGXTokenFromType` narrows to the non-JSON forms only.

### Parameters
  - `value` (`unknown`): The value to check.
  - `type` (`T`, optional): The token type to check against. Has a wide variety of accepted forms, including:
    - String literals corresponding to basic token types, e.g. `'no-op'`, `'literal'`, etc.
    - `null`, which indicates that any token type is acceptable.
    - Constructors for class tokens, which check for instances of those specific constructors.
    - The `RegExp` and `ExtRegExp` constructors, which check for literal tokens.
    - The `RGXTokenCollection` constructor, which checks for arrays of tokens.
    - The string literal `"repeatable"`, which checks for any token that is repeatable (i.e. has `rgxIsRepeatable` true or does not specify `rgxIsRepeatable`).
    - The string literal `"json"`, which checks for any JSON token.
    - Arrays of any of the above, allowing for nested token type specifications.
   Defaults to `null`.
  - `matchLength` (`boolean`, optional): When `type` is an array, whether to require that the value array has the same length as the type array. Defaults to `true`.
  - `acceptJSON` (`J`, optional): Whether JSON object tokens are accepted as described above. Defaults to `true`. The value is carried into the narrowed type via `RGXTokenFromType<T, J>`.

## assertRGXToken
```typescript
function assertRGXToken<T extends RGXTokenTypeGuardInput = null, J extends boolean = true>(value: unknown, type?: T, matchLength?: boolean, acceptJSON?: J): asserts value is RGXTokenFromType<T, J>
```
Asserts that the given value is a valid RGX token, optionally narrowed to a specific token type, with the same logic as `isRGXToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

## isRGXGroupedToken
```typescript
function isRGXGroupedToken(value: unknown, contentCheck?: boolean, acceptJSON?: boolean): value is RGXGroupedToken
```

Checks if the given value is a grouped token — a token that is implicitly or explicitly a group. Arrays and literal tokens (`RegExp`) are implicitly groups. Convertible tokens (including class tokens) are groups if they have `rgxIsGroup` set to `true`, or if they have `rgxGroupWrap` set to `true` and their `toRgx()` method returns a grouped token. When `acceptJSON` is `true` (the default), JSON literal tokens are implicitly groups (like the literals they convert to), and JSON class tokens are groups if the class token they convert to is a group.

### Parameters
  - `value` (`unknown`): The value to check.
  - `contentCheck` (`boolean`, optional): Whether to validate the contents of array tokens and the return values of convertible tokens. Defaults to `true`. When `false`, arrays are accepted without checking their elements, convertible tokens with `rgxGroupWrap` set to `true` are accepted without checking their `toRgx()` return value, and JSON literal tokens are accepted without checking their `source` and `flags`. This has no effect on the `rgxIsGroup` check, which always accepts the token as grouped regardless of `contentCheck`.
  - `acceptJSON` (`boolean`, optional): Whether JSON object tokens (see [json.md](./json.md)) are accepted as described above, including within arrays and `toRgx()` return values. Defaults to `true`.

## assertRGXGroupedToken
```typescript
function assertRGXGroupedToken(value: unknown, contentCheck?: boolean, acceptJSON?: boolean): asserts value is RGXGroupedToken
```
Asserts that the given value is a grouped token with the same logic as `isRGXGroupedToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

# Other Functions
## rgxTokenType
```typescript
function rgxTokenType(value: unknown, recognizeClass?: boolean, acceptJSON?: boolean): RGXTokenType
```

Determines the type of a given RGX token value (`no-op`, `literal`, `native`, `convertible`, `class`, `json`, or an array of the former) or throws an error if the value is not a valid RGX token.

When `recognizeClass` is `true` (the default), `RGXClassToken` instances are identified as `'class'` rather than `'convertible'`. When `recognizeClass` is `false`, class tokens are identified as `'convertible'` instead. When `acceptJSON` is `true` (the default), valid JSON object tokens (see [json.md](./json.md)) are identified as `'json'`; when `false`, they are treated as invalid tokens and an `RGXInvalidTokenError` is thrown. Note that JSON native tokens are always identified as `'native'` (or `'no-op'` for `null`), since they are native tokens. Both preferences are passed through to recursive calls for array elements.

If you narrow the result of this function to something more specific, you can then convert these string or array literals into their corresponding token types using the `RGXTokenFromType` utility type or `rgxTokenFromType` function.

```typescript
const token: RGXToken = ...;
const type = rgxTokenType(token);

if (type === 'native') {
    const narrowedToken1 = token as RGXTokenFromType<typeof type>; // narrowedToken is RGXNativeToken
    const narrowedToken2 = rgxTokenFromType(type, token); // same as above
}
```

### Parameters
  - `value` (`unknown`): The value to check.
  - `recognizeClass` (`boolean`, optional): Whether to recognize `RGXClassToken` instances as `'class'` instead of `'convertible'`. Defaults to `true`.
  - `acceptJSON` (`boolean`, optional): Whether to recognize JSON object tokens as `'json'` instead of throwing. Defaults to `true`.

## rgxTokenTypeFlat
```typescript
function rgxTokenTypeFlat(value: unknown, recognizeClass?: boolean, acceptJSON?: boolean): RGXTokenTypeFlat
```
Determines the flat type of a given RGX token value (`no-op`, `literal`, `native`, `convertible`, `class`, `json`, or `array`) or throws an error if the value is not a valid RGX token. The `array` type represents any array of RGX tokens, regardless of the types of the individual tokens within the array.

When `recognizeClass` is `true` (the default), `RGXClassToken` instances are identified as `'class'` rather than `'convertible'`. This distinction is important because class tokens are also convertible tokens, but the `'class'` type is more specific. When `recognizeClass` is `false`, class tokens are identified as `'convertible'` instead. When `acceptJSON` is `true` (the default), valid JSON object tokens are identified as `'json'`. JSON object tokens are checked before convertible tokens, so an object that has both the `$rgx` flag and a `toRgx` method is identified as `'json'`. When `acceptJSON` is `false`, JSON object tokens are treated as invalid tokens and an `RGXInvalidTokenError` is thrown.

If you narrow the result of this function to something more specific, you can then convert these string literals into their corresponding token types using the `RGXTokenFromType` utility type or `rgxTokenFromType` function.

```typescript
const token: RGXToken = ...;
const type = rgxTokenTypeFlat(token);
if (type === 'array') {
    const narrowedToken1 = token as RGXTokenFromType<typeof type>; // narrowedToken is RGXToken[]
    const narrowedToken2 = rgxTokenFromType(type, token); // same as above
}
```

### Parameters
  - `value` (`unknown`): The value to check.
  - `recognizeClass` (`boolean`, optional): Whether to recognize `RGXClassToken` instances as `'class'` instead of `'convertible'`. Defaults to `true`.
  - `acceptJSON` (`boolean`, optional): Whether to recognize JSON object tokens as `'json'` instead of throwing. Defaults to `true`.

## rgxTokenFromType
```typescript
function rgxTokenFromType<T extends RGXTokenTypeGuardInput>(type: T, value: RGXToken): RGXTokenFromType<T>
```
Does nothing at runtime, but performs a type assertion to the correct subset of `RGXToken` based on the provided `RGXTokenType`.

### Parameters
  - `type` (`T`): The RGX token type to assert to.
  - `value` (`RGXToken`): The RGX token to assert.

### Returns
- `RGXTokenFromType<T>`: The input value, but with its type asserted to the corresponding token type based on the provided `RGXTokenType`.

## rgxTokenTypeToFlat
```typescript
function rgxTokenTypeToFlat(type: RGXTokenType): RGXTokenTypeFlat
```

Converts an `RGXTokenType` to its flat equivalent `RGXTokenTypeFlat`. If the type is an array, it returns `'array'`; otherwise, it returns the type as-is.

## rgxTokenTypeGuardInputToFlat
```typescript
function rgxTokenTypeGuardInputToFlat(type: RGXTokenTypeGuardInput): RGXTokenTypeFlat | null
```

Converts an `RGXTokenTypeGuardInput` to its flat equivalent. If the type is `null`, it returns `null`; if it is an array, it returns `'array'`; if it is a RegEx constructor, it returns `'literal`; if it is the `RGXTokenCollection` constructor, it returns `'convertible'`; if it is an `RGXClassTokenConstructor` (a constructor for an `RGXClassToken` subclass), it returns `'class'` (making it slightly lossy in that case); if it is `"repeatable"`, it returns `null`; otherwise (including `"json"`), it returns the type as-is.