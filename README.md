# RGX
A library for easy construction and validation of regular expressions in TypeScript. You can use `rgx` to concatenate various types of tokens into a valid regular expression string, with type safety and validation.

## Type Reference
```typescript
import { Branded } from "@ptolemy2002/ts-brand-utils";
import { MaybeArray } from "@ptolemy2002/ts-utils";

type RGXNoOpToken = null | undefined;
type RGXLiteralToken = RegExp;
type RGXNativeToken = string | number | boolean | RGXNoOpToken;
type RGXConvertibleToken = { toRgx: () => MaybeArray<RGXNativeToken | RGXLiteralToken> };
type RGXToken = RGXNativeToken | RGXConvertibleToken | RGXToken[];

const validRegexSymbol = Symbol('ValidRegex');
type ValidRegexBrandSymbol = typeof validRegexSymbol;
type ValidRegexString = Branded<string, [ValidRegexBrandSymbol]>;

type RGXTokenType = 'no-op' | 'native' | 'convertible' | RGXTokenType[];
type RGXTokenFromType<T extends RGXTokenType> =
    // ... see source for full definition
;
```

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

### isRGXLiteralToken
```typescript
function isRGXLiteralToken(value: unknown): value is RGXLiteralToken
```

Checks if the given value is a literal token (a `RegExp` object).

#### Parameters
  - `value` (`unknown`): The value to check.

#### Returns
- `boolean`: `true` if the value is a literal token, otherwise `false`.

### isRGXNativeToken
```typescript
function isRGXNativeToken(value: unknown): value is RGXNativeToken
```

Checks if the given value is a native token (string, number, boolean, or no-op).

#### Parameters
  - `value` (`unknown`): The value to check.

#### Returns
- `boolean`: `true` if the value is a native token, otherwise `false`.

### isRGXConvertibleToken
```typescript
function isRGXConvertibleToken(value: unknown): value is RGXConvertibleToken
```

Checks if the given value is a convertible token (an object with a `toRgx` method). Validates that `toRgx` is callable and returns a valid RGX native token or array of native tokens.

#### Parameters
  - `value` (`unknown`): The value to check.

#### Returns
- `boolean`: `true` if the value is a convertible token, otherwise `false`.

### rgxTokenType
```typescript
function rgxTokenType(value: RGXToken): RGXTokenType
```

Determines the type of a given RGX token (`no-op`, `native`, `convertible`, or an array of the former).

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

### isValidRegex
```typescript
function isValidRegex(value: string): value is ValidRegexString
```

Checks if the given string is a valid regular expression by attempting to create a new `RegExp` object with it. If it succeeds, the string is branded as a `ValidRegexString`.

#### Parameters
  - `value` (`string`): The string to check.

#### Returns
- `boolean`: `true` if the string is a valid regular expression, otherwise `false`.

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
function rgx(strings: TemplateStringsArray, ...tokens: RGXToken[]): RegExp
```

A template tag function that constructs a `RegExp` object from the provided template literal. The template literal can contain RGX tokens, which will be resolved and concatenated with the literal parts to form the final regex pattern.

Example usages:
```typescript
const beginning = /^/;
const end = /$/;
const word = /\w+/;
const pattern = rgx`${beginning}testing ${word}${end}`; // /^testing \w+$/ - matches the string "testing " followed by a word, anchored to the start and end of the string

const optionalDigit = /\d?/;
const pattern2 = rgx`${beginning}optional digit: ${optionalDigit}${end}`; // /^optional digit: \d?$/ - matches the string "optional digit: " followed by an optional digit, anchored to the start and end of the string

const pattern3 = rgx`${beginning}value: ${[word, optionalDigit]}${end}`; // /^value: (?:\w+|\d?)$/ - matches the string "value: " followed by either a word or an optional digit, anchored to the start and end of the string
```

#### Parameters
  - `strings` (`TemplateStringsArray`): The literal parts of the template string.
  - `tokens` (`RGXToken[]`): The RGX tokens to be resolved and concatenated with the literal parts.

#### Returns
- `RegExp`: The resulting regular expression object constructed from the template literal.

## Peer Dependencies
- `@ptolemy2002/ts-brand-utils` ^1.0.0
- `@ptolemy2002/ts-utils` ^3.4.0
- `is-callable` ^1.2.7

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
