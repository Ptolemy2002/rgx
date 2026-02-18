# RGX
A library for easy construction and validation of regular expressions in TypeScript. You can use `rgx` to concatenate various types of tokens into a valid regular expression string, with type safety and validation.

## Type Reference
```typescript
import { Branded } from "@ptolemy2002/ts-brand-utils";
import { MaybeArray } from "@ptolemy2002/ts-utils";

type RGXNoOpToken = null | undefined;
type RGXLiteralToken = RegExp;
type RGXNativeToken = string | number | boolean | RGXNoOpToken;
type RGXConvertibleTokenOutput = MaybeArray<RGXNativeToken | RGXLiteralToken>;
type RGXConvertibleToken = { toRgx: () => RGXConvertibleTokenOutput };
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXToken[];

const validRegexSymbol = Symbol('rgx.ValidRegex');
type ValidRegexBrandSymbol = typeof validRegexSymbol;
type ValidRegexString = Branded<string, [ValidRegexBrandSymbol]>;

const validVanillaRegexFlagsSymbol = Symbol('rgx.ValidVanillaRegexFlags');
type ValidVanillaRegexFlagsBrandSymbol = typeof validVanillaRegexFlagsSymbol;
type ValidVanillaRegexFlags = Branded<string, [ValidVanillaRegexFlagsBrandSymbol]>;

type RGXTokenType = 'no-op' | 'literal' | 'native' | 'convertible' | RGXTokenType[];
type RGXTokenTypeFlat = Exclude<RGXTokenType, RGXTokenType[]> | "array";
type RGXTokenFromType<T extends RGXTokenType> =
    // ... see source for full definition
;

type RGXErrorCode = 'UNKNOWN' | 'INVALID_RGX_TOKEN' | 'INVALID_REGEX_STRING' | 'INVALID_VANILLA_REGEX_FLAGS';
type ExpectedTokenType = {
    type: "tokenType";
    values: RGXTokenTypeFlat[];
} | {
    type: "custom";
    values: string[];
};
type RGXTokenCollectionMode = 'union' | 'concat';
```

## Classes
The library exports the following classes:

### RGXError
A custom error class for RGX-related errors. This can be used to throw specific errors related to RGX token validation or resolution.

#### Constructor
```typescript
constructor(message: string, code?: RGXErrorCode)
```
- `message` (`string`): The error message.
- `code` (`RGXErrorCode`, optional): An optional error code that can be used to categorize the error. If not provided, it defaults to 'UNKNOWN'.

#### Properties
- `code` (`RGXErrorCode`): The error code associated with the error, which can be used to identify the type of error that occurred.

### RGXInvalidTokenError extends RGXError
A specific error class for invalid RGX tokens. This error is thrown when a value fails validation as a specific RGX token type. The error code is set to `INVALID_RGX_TOKEN` on instantiation.

#### Constructor
```typescript
constructor(message: string, expected: ExpectedTokenType | null, got: unknown)
```
- `message` (`string`): The error message.
- `expected` (`ExpectedTokenType | null`): Either an object describing the expected token type(s) or `null` if all token types are expected. This is used to generate a human-readable description of what was expected.
- `got` (`unknown`): The actual value that was received, which failed validation.

#### Properties
- `expected` (`string`): A human-readable description of the expected token type(s), generated from the `expected` parameter in the constructor. This can be used to provide more informative error messages.
- `got` (`unknown`): The actual value that was received, which failed validation.

### RGXInvalidRegexStringError extends RGXError
A specific error class for invalid regex strings. This error is thrown when a string fails validation as a valid regex string. The error code is set to `INVALID_REGEX_STRING` on instantiation.

#### Constructor
```typescript
constructor(message: string, got: string)
```
- `message` (`string`): The error message.
- `got` (`string`): The actual string that was received, which failed validation.

#### Properties
- `got` (`string`): The actual string that was received, which failed validation.

### RGXInvalidVanillaRegexFlagsError extends RGXError
A specific error class for invalid vanilla regex flags. This error is thrown when a string fails validation as valid vanilla regex flags. The error code is set to `INVALID_VANILLA_REGEX_FLAGS` on instantiation.

#### Constructor
```typescript
constructor(message: string, got: string)
```
- `message` (`string`): The error message.
- `got` (`string`): The actual string that was received, which failed validation.

#### Properties
- `got` (`string`): The actual string that was received, which failed validation.

### RGXTokenCollection
A class representing a collection of RGX tokens. This is not used internally, but may be useful for users who want to easily manage collections of RGX tokens like an array, but with additional metadata about the collection mode (union or concat).

#### Constructor
```typescript
constructor(tokens: RGXToken[] = [], mode: RGXTokenCollectionMode = 'concat')
```
- `tokens` (`RGXToken[]`, optional): An array of RGX tokens to be managed by the collection. Defaults to an empty array.
- `mode` (`RGXTokenCollectionMode`, optional): The mode of the collection, either 'union' or 'concat'. Defaults to 'concat'.

#### Properties
- `tokens` (`RGXToken[]`): The array of RGX tokens managed by the collection. In almost all cases, use `getTokens()` instead of accessing this property directly, as it will be copied to prevent external mutation.
- `mode` (`RGXTokenCollectionMode`): The mode of the collection, either 'union' or 'concat'. This determines how the tokens in the collection will be resolved when `toRgx()` is called.
- `toRgx()` (`() => ValidRegexString`): A method that resolves the collection to a single RGX token based on the collection mode. In both modes, a string is ultimately returned, but in 'union' mode, the tokens are resolved as alternatives (using the `|` operator), while in 'concat' mode, the tokens are resolved as concatenated together.
- `getTokens()` (`() => RGXToken[]`): A method that returns a copy of the array of RGX tokens managed by the collection. This is used to prevent external mutation of the internal `tokens` array.
- `clone()` (`() => RGXTokenCollection`): A method that creates and returns a deep clone of the RGXTokenCollection instance. This is useful for creating a new collection with the same tokens and mode without affecting the original collection.
- `asConcat()` (`() => RGXTokenCollection`): If this collection is in 'union' mode, this method returns a new RGXTokenCollection instance with the same tokens but in 'concat' mode. If the collection is already in 'concat' mode, it simply returns itself.
- `asUnion()` (`() => RGXTokenCollection`): If this collection is in 'concat' mode, this method returns a new RGXTokenCollection instance with the same tokens but in 'union' mode. If the collection is already in 'union' mode, it simply returns itself.

Standard array properties and methods like `length`, `push`, `pop`, etc. are implemented to work with the internal `tokens` array, but providing collection instances instead of raw arrays when relevant (e.g., `map` has the third parameter typed as `RGXTokenCollection` instead of `RGXToken[]`).

## Functions
The following functions are exported by the library:

### isRGXNoOpToken
```typescript
function isRGXNoOpToken(value: unknown): value is RGXNoOpToken
```

Checks if the given value is a no-op token (`null` or `undefined`).

#### Parameters
  - `value` (`unknown`): The value to check.

#### Returns
- `boolean`: `true` if the value is a no-op token, otherwise `false`.

### assertRGXNoOpToken
```typescript
function assertRGXNoOpToken(value: unknown): asserts value is RGXNoOpToken
```

Asserts that the given value is a no-op token (`null` or `undefined`). If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Parameters
  - `value` (`unknown`): The value to assert.

#### Returns
- `void`: This function does not return a value, but will throw an error if the assertion fails.

### isRGXLiteralToken
```typescript
function isRGXLiteralToken(value: unknown): value is RGXLiteralToken
```

Checks if the given value is a literal token (a `RegExp` object).

#### Parameters
  - `value` (`unknown`): The value to check.

#### Returns
- `boolean`: `true` if the value is a literal token, otherwise `false`.

### assertRGXLiteralToken
```typescript
function assertRGXLiteralToken(value: unknown): asserts value is RGXLiteralToken
```

Asserts that the given value is a literal token (a `RegExp` object). If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Parameters
  - `value` (`unknown`): The value to assert.

#### Returns
- `void`: This function does not return a value, but will throw an error if the assertion fails.

### isRGXNativeToken
```typescript
function isRGXNativeToken(value: unknown): value is RGXNativeToken
```

Checks if the given value is a native token (string, number, boolean, or no-op).

#### Parameters
  - `value` (`unknown`): The value to check.

#### Returns
- `boolean`: `true` if the value is a native token, otherwise `false`.

### assertRGXNativeToken
```typescript
function assertRGXNativeToken(value: unknown): asserts value is RGXNativeToken
```

Asserts that the given value is a native token (string, number, boolean, or no-op). If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Parameters
  - `value` (`unknown`): The value to assert.

#### Returns
- `void`: This function does not return a value, but will throw an error if the assertion fails.

### isRGXConvertibleToken
```typescript
function isRGXConvertibleToken(value: unknown): value is RGXConvertibleToken
```

Checks if the given value is a convertible token (an object with a `toRgx` method). Validates that `toRgx` is callable and returns a valid RGX native or literal token, or an array of native/literal tokens.

#### Parameters
  - `value` (`unknown`): The value to check.

#### Returns
- `boolean`: `true` if the value is a convertible token, otherwise `false`.

### assertRGXConvertibleToken
```typescript
function assertRGXConvertibleToken(value: unknown): asserts value is RGXConvertibleToken
```
Asserts that the given value is a convertible token (an object with a `toRgx` method). Validates that `toRgx` is callable and returns a valid RGX native or literal token, or an array of native/literal tokens. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Parameters
  - `value` (`unknown`): The value to assert.

#### Returns
- `void`: This function does not return a value, but will throw an error if the assertion fails.

### rgxTokenType
```typescript
function rgxTokenType(value: RGXToken): RGXTokenType
```

Determines the type of a given RGX token (`no-op`, `literal`, `native`, `convertible`, or an array of the former).

If you narrow the result of this function to something more specific, you can then convert these string or array literals into their corresponding token types using the `RGXTokenFromType` utility type or `rgxTokenFromType` function.

```typescript
const token: RGXToken = ...;
const type = rgxTokenType(token);

if (type === 'native') {
    const narrowedToken1 = token as RGXTokenFromType<typeof type>; // narrowedToken is RGXNativeToken
    const narrowedToken2 = rgxTokenFromType(type, token); // same as above
}
```

#### Parameters
  - `value` (`RGXToken`): The RGX token to check.

#### Returns
- `RGXTokenType`: The type of the RGX token.

### rgxTokenFromType
```typescript
function rgxTokenFromType<T extends RGXTokenType>(type: T, value: RGXToken): RGXTokenFromType<T>
```

Does nothing at runtime, but performs a type assertion to the correct subset of `RGXToken` based on the provided `RGXTokenType`.

#### Parameters
  - `type` (`T`): The RGX token type to assert to.
  - `value` (`RGXToken`): The RGX token to assert.

#### Returns
- `RGXTokenFromType<T>`: The input value, but with its type asserted to the corresponding token type based on the provided `RGXTokenType`.

### isValidRegexString
```typescript
function isValidRegexString(value: string): value is ValidRegexString
```

Checks if the given string is a valid regular expression by attempting to create a new `RegExp` object with it. If it succeeds, the string is branded as a `ValidRegexString`.

#### Parameters
  - `value` (`string`): The string to check.

#### Returns
- `boolean`: `true` if the string is a valid regular expression, otherwise `false`.

### assertValidRegexString
```typescript
function assertValidRegexString(value: string): asserts value is ValidRegexString
```
Asserts that the given string is a valid regular expression by attempting to create a new `RegExp` object with it. If it succeeds, the string is branded as a `ValidRegexString`. If the assertion fails, an `RGXInvalidRegexStringError` will be thrown.

#### Parameters
  - `value` (`string`): The string to assert.

#### Returns
- `void`: This function does not return a value, but will throw an error if the assertion fails.

### isValidVanillaRegexFlags
```typescript
function isValidVanillaRegexFlags(value: string): value is ValidVanillaRegexFlags
```

Checks if the given string is a valid combination of vanilla regex flags (g, i, m, s, u, y). Each flag can only appear once.

#### Parameters
  - `value` (`string`): The string to check.

#### Returns
- `boolean`: `true` if the string is a valid combination of vanilla regex flags, otherwise `false`.

### assertValidVanillaRegexFlags
```typescript
function assertValidVanillaRegexFlags(value: string): asserts value is ValidVanillaRegexFlags
```
Asserts that the given string is a valid combination of vanilla regex flags (g, i, m, s, u, y). Each flag can only appear once. If the assertion fails, an `RGXInvalidVanillaRegexFlagsError` will be thrown.

#### Parameters
  - `value` (`string`): The string to assert.

#### Returns
- `void`: This function does not return a value, but will throw an error if the assertion fails.

### escapeRegex
```typescript
function escapeRegex(value: string): ValidRegexString
```

Escapes special regex characters in the given string and brands the result as a `ValidRegexString`.

#### Parameters
  - `value` (`string`): The string to escape.

#### Returns
- `ValidRegexString`: The escaped string, branded as a valid regex string.

### resolveRGXToken
```typescript
function resolveRGXToken(token: RGXToken): ValidRegexString
```

Resolves an RGX token to a string. No-op tokens resolve to an empty string, literal tokens are included as-is (wrapped in a non-capturing group), native tokens are converted to strings and escaped, convertible tokens are converted using their `toRgx` method and then resolved recursively, and arrays of tokens are resolved as unions of their resolved elements (placed in a non-capturing group).

#### Parameters
  - `token` (`RGXToken`): The RGX token to resolve.

#### Returns
- `ValidRegexString`: The resolved string representation of the RGX token. This is guaranteed to be a valid regex string, as convertible tokens are validated to only produce valid regex strings or arrays of valid regex strings.

### rgxConcat
```typescript
function rgxConcat(tokens: RGXToken[]): ValidRegexString
```

A helper function that resolves an array of RGX tokens and concatenates their resolved string representations together. This is useful for cases where you want to concatenate multiple tokens without creating a union between them.

#### Parameters
  - `tokens` (`RGXToken[]`): The array of RGX tokens to resolve and concatenate.

#### Returns
- `ValidRegexString`: The concatenated string representation of the resolved RGX tokens. This is guaranteed to be a valid regex string, as it is composed of the resolved forms of RGX tokens, which are all valid regex strings.

### rgx
```typescript
function rgx(flags?: string): (strings: TemplateStringsArray, ...tokens: RGXToken[]) =>RegExp
```

Creates and returns a template tag function that constructs a `RegExp` object from the provided template literal with the provided flags. The template literal can contain RGX tokens, which will be resolved and concatenated with the literal parts to form the final regex pattern.

Example usages:
```typescript
const beginning = /^/;
const end = /$/;
const word = /\w+/;
const pattern = rgx()`${beginning}testing ${word}${end}`; // /^testing \w+$/ - matches the string "testing " followed by a word, anchored to the start and end of the string

const optionalDigit = /\d?/;
const pattern2 = rgx()`${beginning}optional digit: ${optionalDigit}${end}`; // /^optional digit: \d?$/ - matches the string "optional digit: " followed by an optional digit, anchored to the start and end of the string

const pattern3 = rgx()`${beginning}value: ${[word, optionalDigit]}${end}`; // /^value: (?:\w+|\d?)$/ - matches the string "value: " followed by either a word or an optional digit, anchored to the start and end of the string
```

#### Parameters
**Direct**
  - `flags` (`string`, optional): The regex flags to apply to the resulting `RegExp` object (e.g., 'g', 'i', 'm', etc.). If not provided, no flags will be applied. If provided and not valid vanilla regex flags, an `RGXInvalidVanillaRegexFlagsError` will be thrown.

**Template Tag**
  - `strings` (`TemplateStringsArray`): The literal parts of the template string.
  - `tokens` (`RGXToken[]`): The RGX tokens to be resolved and concatenated with the literal parts.

#### Returns
- `(strings: TemplateStringsArray, ...tokens: RGXToken[]) => RegExp`: A template tag function that takes a template literal and returns a `RegExp` object constructed from the resolved tokens, literal parts, and the provided flags.

### rgxa
```typescript
function rgxa(tokens: RGXToken[], flags?: string): RegExp
```
As an alternative to using the `rgx` template tag, you can directly call `rgxa` with an array of RGX tokens and optional flags to get a `RegExp` object. This is useful in cases where you don't want to use a template literal.

#### Parameters
  - `tokens` (`RGXToken[]`): The RGX tokens to be resolved and concatenated to form the regex pattern.
  - `flags` (`string`, optional): The regex flags to apply to the resulting `RegExp` object (e.g., 'g', 'i', 'm', etc.). If not provided, no flags will be applied. If provided and not valid vanilla regex flags, an `RGXInvalidVanillaRegexFlagsError` will be thrown.

#### Returns
- `RegExp`: A `RegExp` object constructed from the resolved tokens and the provided flags.

## Peer Dependencies
- `@ptolemy2002/immutability-utils` ^2.0.0
- `@ptolemy2002/js-utils` ^3.2.2
- `@ptolemy2002/ts-brand-utils` ^1.0.0
- `@ptolemy2002/ts-utils` ^3.4.0
- `is-callable` ^1.2.7
- `lodash.clonedeep` ^4.5.0

## Commands
The following commands exist in the project:

- `npm run uninstall` - Uninstalls all dependencies for the library
- `npm run reinstall` - Uninstalls and then Reinstalls all dependencies for the library
- `npm run build` - Builds the library
- `npm run release` - Publishes the library to npm without changing the version
- `npm run release-patch` - Publishes the library to npm with a patch version bump
- `npm run release-minor` - Publishes the library to npm with a minor version bump
- `npm run release-major` - Publishes the library to npm with a major version bump
- `npm run test` - Runs the tests for the library
- `npm run test:watch` - Runs the tests for the library in watch mode
- `npm run test:coverage` - Runs the tests for the library and generates a coverage report
