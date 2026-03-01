# RGX
A library for easy construction and validation of regular expressions in TypeScript. You can use `rgx` to concatenate various types of tokens into a valid regular expression string, with type safety and validation.

**Note**: This library is tested with nearly 100% coverage, but any override of `RGXClassToken.clone()` does not have the depth parameter fully tested, as that is ultimately part of `@ptolemy2002/immutability-utils`, which is tested, and setting up tests for that functionality is exceedingly complex.

## Type Reference
```typescript
import { Branded } from "@ptolemy2002/ts-brand-utils";
import { CloneDepth } from "@ptolemy2002/immutability-utils";
// type CloneDepth = number | "max";

type RGXNoOpToken = null | undefined;
type RGXLiteralToken = RegExp;
type RGXNativeToken = string | number | boolean | RGXNoOpToken;
type RGXConvertibleToken = {
    toRgx: () => RGXToken,
    rgxAcceptInsertion?: (tokens: RGXToken[], flags: ValidRegexFlags) => string | boolean,
    readonly rgxGroupWrap?: boolean,
    readonly rgxIsGroup?: boolean,
    readonly rgxIsRepeatable?: boolean
};
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXToken[];

type RGXClassTokenConstructor = new (...args: unknown[]) => RGXClassToken;
type RGXGroupedToken = RGXToken[] | RGXLiteralToken | RGXGroupedConvertibleToken;
type RGXGroupedConvertibleToken = (RGXConvertibleToken & { readonly rgxIsGroup: true }) | (Omit<RGXConvertibleToken, "toRgx"> & { toRgx: () => RGXGroupedToken, readonly rgxGroupWrap: true  });

const validRegexSymbol = Symbol('rgx.ValidRegex');
type ValidRegexBrandSymbol = typeof validRegexSymbol;
type ValidRegexString = Branded<string, [ValidRegexBrandSymbol]>;

const validVanillaRegexFlagsSymbol = Symbol('rgx.ValidVanillaRegexFlags');
type ValidVanillaRegexFlagsBrandSymbol = typeof validVanillaRegexFlagsSymbol;
type ValidVanillaRegexFlags = Branded<string, [ValidVanillaRegexFlagsBrandSymbol]>;

const validRegexFlagsSymbol = Symbol('rgx.ValidRegexFlags');
type ValidRegexFlagsBrandSymbol = typeof validRegexFlagsSymbol;
type ValidRegexFlags = Branded<string, [ValidRegexFlagsBrandSymbol]> | ValidVanillaRegexFlags;

type RegExpFlagTransformer = (exp: RegExp) => RegExp;

const validIdentifierSymbol = Symbol('rgx.ValidIdentifier');
type ValidIdentifierBrandSymbol = typeof validIdentifierSymbol;
type ValidIdentifier = Branded<string, [ValidIdentifierBrandSymbol]>;

type RGXTokenType = 'no-op' | 'literal' | 'native' | 'convertible' | 'class' | RGXTokenType[];
type RGXTokenTypeFlat = Exclude<RGXTokenType, RGXTokenType[]> | "array";
type RGXTokenTypeGuardInput = RGXTokenTypeFlat | null | RGXClassTokenConstructor | typeof RegExp | typeof ExtRegExp | typeof RGXTokenCollection | RGXTokenTypeGuardInput[];
type RGXTokenFromType<T extends RGXTokenTypeGuardInput> =
    // Maps token type strings to their corresponding types, e.g.:
    // 'no-op' -> RGXNoOpToken, 'literal' -> RGXLiteralToken, etc.
    // Also maps any constructor to InstanceType<T>,
    // and preserves tuple types for constant arrays.
    // ... see source for full definition
;

type RGXErrorCode = 'UNKNOWN' | 'INVALID_RGX_TOKEN' | 'INVALID_REGEX_STRING' | 'INVALID_REGEX_FLAGS' | 'INVALID_VANILLA_REGEX_FLAGS' | 'NOT_IMPLEMENTED' | 'NOT_SUPPORTED' | 'INVALID_IDENTIFIER' | 'OUT_OF_BOUNDS' | 'INVALID_FLAG_TRANSFORMER_KEY' | 'FLAG_TRANSFORMER_CONFLICT' | 'CONSTANT_CONFLICT' | 'INVALID_CONSTANT_KEY' | 'INSERTION_REJECTED' | 'REGEX_NOT_MATCHED_AT_POSITION';

type RangeObject = {
    min?: number | null;
    max?: number | null;
    inclusiveLeft?: boolean;
    inclusiveRight?: boolean;
};
type ExpectedTokenType = {
    type: "tokenType";
    values: RGXTokenTypeFlat[];
} | {
    type: "custom";
    values: string[];
};
type RGXTokenCollectionMode = 'union' | 'concat';
type RGXTokenCollectionInput = RGXToken | RGXTokenCollection;

type RGXUnionInsertionPosition = 'prefix' | 'suffix';

type RGXGroupTokenArgs = {
    name?: string | null;
    capturing?: boolean;
};

type RGXPartControl = "skip" | "stop" | "silent" | void;

type RGXCapture<T = unknown> = {
    raw: string;
    value: T;
};

type RGXPartOptions<R, T=string> = {
    transform: (captured: string) => T;
    validate: (captured: RGXCapture<T>, part: RGXPart<R, T>, walker: RGXWalker<R>) => boolean | string;
    beforeCapture: ((part: RGXPart<R, T>, walker: RGXWalker<R>) => RGXPartControl) | null;
    afterCapture: ((capture: RGXCapture<T>, part: RGXPart<R, T>, walker: RGXWalker<R>) => void) | null;
};

type RGXWalkerOptions<R> = {
    startingSourcePosition?: number;
    reduced?: R;
};
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

#### Methods
- `toString() => string`: Returns a formatted string in the format `${name}: ${message}`. Subclasses customize the message portion via internal formatting rather than overriding `toString()` directly, so all `RGXError` subclasses produce consistently formatted strings through this single method.

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

### RGXNotImplementedError extends RGXError
A specific error class for unimplemented functionality. This error is thrown when a feature or method has not been implemented yet. The error code is set to `NOT_IMPLEMENTED` on instantiation.

#### Constructor
```typescript
constructor(functionality: string, message?: string | null)
```
- `functionality` (`string`): A description of the functionality that is not yet implemented.
- `message` (`string | null`, optional): An optional additional message providing more context. Defaults to `null`.

#### Properties
- `functionality` (`string`): The description of the unimplemented functionality.

### RGXNotSupportedError extends RGXError
A specific error class for unsupported functionality. This error is thrown when a feature or method is intentionally not supported (as opposed to simply not yet implemented). The error code is set to `NOT_SUPPORTED` on instantiation.

#### Constructor
```typescript
constructor(functionality: string, message?: string | null)
```
- `functionality` (`string`): A description of the functionality that is not supported.
- `message` (`string | null`, optional): An optional additional message providing more context. Defaults to `null`.

#### Properties
- `functionality` (`string`): The description of the unsupported functionality.

### RGXInvalidIdentifierError extends RGXError
A specific error class for invalid identifiers. This error is thrown when a string fails validation as a valid identifier. The error code is set to `INVALID_IDENTIFIER` on instantiation.

#### Constructor
```typescript
constructor(message: string, got: string)
```
- `message` (`string`): The error message.
- `got` (`string`): The actual string that was received, which failed validation.

#### Properties
- `got` (`string`): The actual string that was received, which failed validation.

### RGXInvalidRegexFlagsError extends RGXError
A specific error class for invalid regex flags (including both vanilla and custom registered flags). This error is thrown when a string fails validation as valid regex flags. The error code is set to `INVALID_REGEX_FLAGS` on instantiation.

#### Constructor
```typescript
constructor(message: string, got: string)
```
- `message` (`string`): The error message.
- `got` (`string`): The actual string that was received, which failed validation.

#### Properties
- `got` (`string`): The actual string that was received, which failed validation.

### RGXInvalidFlagTransformerKeyError extends RGXError
A specific error class for invalid flag transformer keys. This error is thrown when an invalid key is provided to `registerFlagTransformer` (e.g., a key that is not a single character). The error code is set to `INVALID_FLAG_TRANSFORMER_KEY` on instantiation.

#### Constructor
```typescript
constructor(message: string, got: string)
```
- `message` (`string`): The error message.
- `got` (`string`): The actual key string that was received, which failed validation.

#### Properties
- `got` (`string`): The actual key string that was received, which failed validation.

### RGXFlagTransformerConflictError extends RGXError
A specific error class for flag transformer conflicts. This error is thrown when attempting to register a flag transformer with a key that conflicts with an existing vanilla regex flag or an already-registered transformer. The error code is set to `FLAG_TRANSFORMER_CONFLICT` on instantiation.

#### Constructor
```typescript
constructor(message: string, got: string)
```
- `message` (`string`): The error message.
- `got` (`string`): The conflicting key string.

#### Properties
- `got` (`string`): The conflicting key string.

### RGXInvalidConstantKeyError extends RGXError
A specific error class for invalid constant keys. This error is thrown when attempting to access or assert an RGX constant with a name that does not exist. The error code is set to `INVALID_CONSTANT_KEY` on instantiation.

#### Constructor
```typescript
constructor(message: string, got: string)
```
- `message` (`string`): The error message.
- `got` (`string`): The constant name that was not found.

#### Properties
- `got` (`string`): The constant name that was not found.

### RGXConstantConflictError extends RGXError
A specific error class for constant name conflicts. This error is thrown when attempting to define an RGX constant with a name that is already in use. The error code is set to `CONSTANT_CONFLICT` on instantiation.

#### Constructor
```typescript
constructor(message: string, got: string)
```
- `message` (`string`): The error message.
- `got` (`string`): The conflicting constant name.

#### Properties
- `got` (`string`): The conflicting constant name.

### RGXInsertionRejectedError extends RGXError
A specific error class for token insertion rejection. This error is thrown when a convertible token's `rgxAcceptInsertion` method returns `false` or a string (rejection reason) during pattern construction via `rgx`, `rgxa`, or `rgxConcat`. The error code is set to `INSERTION_REJECTED` on instantiation.

#### Constructor
```typescript
constructor(reason?: string | null, message?: string | null)
```
- `reason` (`string | null`, optional): The reason the insertion was rejected. Defaults to `null`.
- `message` (`string | null`, optional): An optional additional message providing more context. Defaults to `null`.

#### Properties
- `reason` (`string | null`): The reason the insertion was rejected, or `null` if no reason was provided.

### RGXRegexNotMatchedAtPositionError extends RGXError
A specific error class for regex match failures at a given position. This error is thrown when a regex is expected to match at a specific position in a string but does not (e.g., via `assertRegexMatchesAtPosition`). The error code is set to `REGEX_NOT_MATCHED_AT_POSITION` on instantiation.

#### Constructor
```typescript
constructor(message: string, pattern: RegExp, source: string, position: number, contextSize?: number | null)
```
- `message` (`string`): The error message.
- `pattern` (`RegExp`): The regex pattern that failed to match.
- `source` (`string`): The string that was being matched against.
- `position` (`number`): The zero-based index in the source string where the match was expected. Must be >= 0 and < `source.length`, or an `RGXOutOfBoundsError` will be thrown.
- `contextSize` (`number | null`, optional): The number of characters on each side of the position to include in contextual output. Defaults to `null` (full source shown).

#### Properties
- `pattern` (`RegExp`): The regex pattern that failed to match.
- `source` (`string`): The string that was being matched against.
- `position` (`number`): The position where the match was expected. Setting this validates that the value is >= 0 and < `source.length`, throwing `RGXOutOfBoundsError` if not.
- `contextSize` (`number | null`): The number of characters on each side of the position to include in contextual output, or `null` for the full source.

#### Methods
- `sourceContext() => string`: Returns the relevant portion of the source string around the position. When `contextSize` is `null` or covers the entire string, returns the full source. Otherwise, returns a substring from `max(0, position - contextSize)` to `min(source.length, position + contextSize)`.
- `hasLeftContext() => boolean`: Returns `true` if the context window starts after the beginning of the source string (i.e., there is truncated content on the left). Returns `false` when `contextSize` is `null`.
- `hasRightContext() => boolean`: Returns `true` if the context window ends before the end of the source string (i.e., there is truncated content on the right). Returns `false` when `contextSize` is `null`.
- `hasFullContext() => boolean`: Returns `true` when the full source is shown (neither side is truncated). This is the case when `contextSize` is `null` or when the context window covers the entire source string.

### RGXOutOfBoundsError extends RGXError
A specific error class for out-of-bounds values. This error is thrown when a numeric value falls outside an expected range. The error code is set to `OUT_OF_BOUNDS` on instantiation.

#### Constructor
```typescript
constructor(message: string, got: number, { min, max, inclusiveLeft, inclusiveRight }?: RangeObject)
```
- `message` (`string`): The error message.
- `got` (`number`): The actual numeric value that was received, which fell outside the expected range.
- `min` (`number | null`, optional): The minimum bound of the range. Defaults to `null` (no minimum).
- `max` (`number | null`, optional): The maximum bound of the range. Defaults to `null` (no maximum). Setting `min` to a value greater than `max` will adjust `max` to equal `min`, and vice versa.
- `inclusiveLeft` (`boolean`, optional): Whether the minimum bound is inclusive. Defaults to `true`.
- `inclusiveRight` (`boolean`, optional): Whether the maximum bound is inclusive. Defaults to `true`.

#### Properties
- `got` (`number`): The actual numeric value that was received.
- `min` (`number | null`): The minimum bound of the range. Setting this to a value greater than `max` will adjust `max` to equal `min`.
- `max` (`number | null`): The maximum bound of the range. Setting this to a value less than `min` will adjust `min` to equal `max`.
- `inclusiveLeft` (`boolean`): Whether the minimum bound is inclusive.
- `inclusiveRight` (`boolean`): Whether the maximum bound is inclusive.

#### Methods
- `failedAtMin() => boolean`: Returns `true` if the `got` value is below the minimum bound (respecting `inclusiveLeft`), otherwise `false`. Returns `false` if `min` is `null`.
- `failedAtMax() => boolean`: Returns `true` if the `got` value is above the maximum bound (respecting `inclusiveRight`), otherwise `false`. Returns `false` if `max` is `null`.
- `failedAtAny() => boolean`: Returns `true` if the value failed at either the minimum or maximum bound.

### RGXPartValidationFailedError extends RGXError
A specific error class for RGX part validation failures. This error is thrown when a captured value fails validation in a custom part's `validate` function. The error code is set to `PART_VALIDATION_FAILED` on instantiation.

#### Constructor
```typescript
constructor(message: string, gotRaw: string, gotTransformed: unknown)
```
- `message` (`string`): The error message.
- `gotRaw` (`string`): The raw captured string value that failed validation.
- `gotTransformed` (`unknown`): The transformed value that was produced by the part's `transform` function, which also failed validation.

#### Properties
- `gotRaw` (`string`): The raw captured string value that failed validation.
- `gotTransformed` (`unknown`): The transformed value that was produced by the part's `transform` function, which also failed validation.

### RGXTokenCollection
A class representing a collection of RGX tokens. This class manages collections of RGX tokens like an array, but with additional metadata about the collection mode (union or concat). Since `toRgx()` returns a `RegExp`, instances of this class satisfy the `RGXConvertibleToken` interface and can be used directly as tokens in `rgx`, `rgxa`, and other token-accepting functions.

A function `rgxTokenCollection` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

#### Constructor
```typescript
constructor(tokens: RGXTokenCollectionInput = [], mode: RGXTokenCollectionMode = 'concat')
```
- `tokens` (`RGXTokenCollectionInput`, optional): The tokens to be managed by the collection. This can be an array of RGX tokens, a single RGX token (which will be wrapped in an array), or another `RGXTokenCollection` (whose tokens will be copied). Defaults to an empty array.
- `mode` (`RGXTokenCollectionMode`, optional): The mode of the collection, either 'union' or 'concat'. Defaults to 'concat'.

#### Properties
- `tokens` (`RGXToken[]`): The array of RGX tokens managed by the collection. In almost all cases, use `getTokens()` instead of accessing this property directly, as it will be copied to prevent external mutation.
- `mode` (`RGXTokenCollectionMode`): The mode of the collection, either 'union' or 'concat'. This determines how the tokens in the collection will be resolved when `toRgx()` is called.
- `resolve() => ValidRegexString`: A convenience method that resolves this collection by calling `resolveRGXToken(this)`, returning the resolved regex string representation.
- `toRgx() => RegExp`: A method that resolves the collection to a `RegExp` object based on the collection mode. In 'union' mode, the tokens are resolved as alternatives (using the `|` operator), while in 'concat' mode, the tokens are resolved as concatenated together. No flags are applied to the resulting `RegExp`. Since this method returns a `RegExp` (which is `RGXLiteralToken`), `RGXTokenCollection` instances satisfy the `RGXConvertibleToken` interface and can be used directly as tokens in `rgx`, `rgxa`, and other token-accepting functions.
- `getTokens() => RGXToken[]`: A method that returns a copy of the array of RGX tokens managed by the collection. This is used to prevent external mutation of the internal `tokens` array.
- `toArray() => RGXToken[]`: An alias for `getTokens()`, provided for convenience.
- `clone(depth: CloneDepth = "max") => RGXTokenCollection`: A method that creates and returns a deep clone of the RGXTokenCollection instance. This is useful for creating a new collection with the same tokens and mode without affecting the original collection. The `depth` parameter controls how deeply nested collections are cloned: `0` for no clone, `1` for a shallow clone of the top-level collection, any other number for that many levels down, and `"max"` (the default) for a full deep clone.
- `asConcat() => RGXTokenCollection`: If this collection is in 'union' mode, this method returns a new RGXTokenCollection instance with the same tokens but in 'concat' mode. If the collection is already in 'concat' mode, it simply returns itself.
- `asUnion() => RGXTokenCollection`: If this collection is in 'concat' mode, this method returns a new RGXTokenCollection instance with the same tokens but in 'union' mode. If the collection is already in 'union' mode, it simply returns itself.

Standard array properties and methods like `length`, `push`, `pop`, etc. are implemented to work with the internal `tokens` array, but providing collection instances instead of raw arrays when relevant (e.g., `map` has the third parameter typed as `RGXTokenCollection` instead of `RGXToken[]`).

#### Static Properties
- `check(value: unknown): value is RGXTokenCollection`: A type guard that checks if the given value is an instance of `RGXTokenCollection`.
- `assert(value: unknown): asserts value is RGXTokenCollection`: An assertion that checks if the given value is an instance of `RGXTokenCollection`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

### RGXClassToken (abstract)
An abstract base class for creating custom RGX token classes. Subclasses must implement the `toRgx()` method, which returns any valid `RGXToken` (including other convertible tokens, allowing for recursive structures).

#### Static Properties
- `check(value: unknown): value is RGXClassToken`: A type guard that checks if the given value is an instance of `RGXClassToken`.
- `assert(value: unknown): asserts value is RGXClassToken`: An assertion that checks if the given value is an instance of `RGXClassToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Abstract Methods
- `toRgx() => RGXToken`: Must be implemented by subclasses to return the token's regex representation as any valid RGX token (native, literal, convertible, or array of tokens).
- `clone(depth: CloneDepth = "max") => RGXClassToken`: Must be implemented by subclasses to return a deep clone of the token instance. The `depth` parameter controls how deeply nested tokens are cloned: `0` for no clone, `1` for a shallow clone of the top-level token, any other number for that many levels down, and `"max"` (the default) for a full deep clone.

#### Properties
- `rgxIsGroup` (`boolean`): Returns `false` by default. Subclasses can override this to indicate whether the token represents a group.
- `rgxIsRepeatable` (`boolean`): Returns `true` by default. Subclasses can override this to indicate that the token cannot be wrapped in an `RGXRepeatToken`. When `false`, attempting to set this token as the `token` property of an `RGXRepeatToken` (including via `repeat()` or `optional()`) will throw an `RGXNotSupportedError`.
- `rgxGroupWrap` (`boolean`): Returns `true` by default. Controls whether the resolver wraps this token's resolved output in a non-capturing group. Subclasses can override this to prevent double-wrapping (e.g., when the token already wraps itself in a group).

#### Methods
- `rgxAcceptInsertion(tokens: RGXToken[], flags: ValidRegexFlags) => string | boolean`: Called during pattern construction (via `rgx`, `rgxa`, or `rgxConcat`) to allow the token to reject its own insertion based on the surrounding tokens and the pattern's flags. Returns `true` to accept insertion (the default), `false` to reject with no reason, or a string to reject with a reason message. When a token rejects insertion, an `RGXInsertionRejectedError` is thrown. Subclasses can override this to enforce constraints such as requiring certain flags to be present.
- `or(...others: RGXTokenCollectionInput[]) => RGXClassUnionToken`: Creates an `RGXClassUnionToken` that represents a union (alternation) of this token with the provided others. If any of the `others` are `RGXClassUnionToken` instances, their tokens are flattened into the union rather than nested. If `this` is already an `RGXClassUnionToken`, its existing tokens are preserved and the others are appended.
- `group(args?: RGXGroupTokenArgs, ...others: RGXTokenCollectionInput[]) => RGXGroupToken`: Wraps this token in an `RGXGroupToken` with the provided arguments. The `args` parameter defaults to `{}`, which creates a capturing group with no name. Any additional `others` are included in the group alongside `this`. This is a convenience method that creates a new `RGXGroupToken` with `this` and the `others` as the tokens.
- `repeat(min?: number, max?: number | null, lazy?: boolean) => RGXRepeatToken`: Wraps this token in an `RGXRepeatToken` with the given repetition bounds. `min` defaults to `1`, `max` defaults to `min`, `lazy` defaults to `false`. Pass `null` for `max` to allow unlimited repetitions. When `lazy` is `true`, the resulting quantifier will be non-greedy. This is a convenience method that creates a new `RGXRepeatToken` with `this` as the token. Throws `RGXNotSupportedError` if called on a token with `rgxIsRepeatable` set to `false` (e.g., `RGXLookaroundToken`).
- `optional(lazy?: boolean) => RGXRepeatToken`: Shorthand for `repeat(0, 1, lazy)`. Wraps this token in an `RGXRepeatToken` that matches the token zero or one times. `lazy` defaults to `false`. Throws `RGXNotSupportedError` if called on a token with `rgxIsRepeatable` set to `false` (e.g., `RGXLookaroundToken`).
- `asLookahead(positive?: boolean) => RGXLookaheadToken`: Wraps this token in an `RGXLookaheadToken`. `positive` defaults to `true`. If this token is already an `RGXLookaheadToken`, it is returned as-is without re-wrapping.
- `asLookbehind(positive?: boolean) => RGXLookbehindToken`: Wraps this token in an `RGXLookbehindToken`. `positive` defaults to `true`. If this token is already an `RGXLookbehindToken`, it is returned as-is without re-wrapping.
- `resolve() => ValidRegexString`: A convenience method that resolves this token by calling `resolveRGXToken(this)`, returning the resolved regex string representation. Since this method is defined on `RGXClassToken`, it is available on all subclasses including `RGXClassUnionToken`, `RGXGroupToken`, `RGXRepeatToken`, and `RGXLookaroundToken`.

### RGXClassUnionToken extends RGXClassToken
A class representing a union (alternation) of RGX tokens. This is typically created via the `or()` method on `RGXClassToken`, but can also be instantiated directly.

A function `rgxClassUnion` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

#### Static Properties
- `check(value: unknown): value is RGXClassUnionToken`: A type guard that checks if the given value is an instance of `RGXClassUnionToken`.
- `assert(value: unknown): asserts value is RGXClassUnionToken`: An assertion that checks if the given value is an instance of `RGXClassUnionToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Constructor
```typescript
constructor(tokens: RGXTokenCollectionInput = [])
```
- `tokens` (`RGXTokenCollectionInput`, optional): The tokens to include in the union. Internally stored as an `RGXTokenCollection` in 'union' mode. Defaults to an empty array.

#### Properties
- `tokens` (`RGXTokenCollection`): The internal collection of tokens managed in 'union' mode.
#### Methods
- `add(token: RGXToken, pos?: RGXUnionInsertionPosition) => this`: Adds a token to the union. The `pos` parameter controls where the token is inserted: `'prefix'` inserts at the beginning, `'suffix'` (default) appends to the end. Returns `this` for chaining.
- `concat(pos?: RGXUnionInsertionPosition, ...others: RGXTokenCollectionInput[]) => this`: Concatenates additional tokens into the union. The `pos` parameter controls insertion position: `'suffix'` (default) appends to the end, `'prefix'` prepends to the beginning. Returns `this` for chaining.
- `cleanTokens() => this`: Expands any nested union tokens and removes duplicates from the internal token collection. Returns `this` for chaining. Called automatically during construction and after `add` or `concat`.
- `toRgx() => RegExp`: Resolves the union by calling `toRgx()` on the internal `RGXTokenCollection`, returning a `RegExp`.

### RGXGroupToken extends RGXClassToken
A class representing a group (capturing, non-capturing, or named) wrapping one or more RGX tokens. This is typically created via the `group()` method on `RGXClassToken`, but can also be instantiated directly.

A function `rgxGroup` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

#### Static Properties
- `check(value: unknown): value is RGXGroupToken`: A type guard that checks if the given value is an instance of `RGXGroupToken`.
- `assert(value: unknown): asserts value is RGXGroupToken`: An assertion that checks if the given value is an instance of `RGXGroupToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Constructor
```typescript
constructor(args?: RGXGroupTokenArgs, tokens?: RGXTokenCollectionInput)
```
- `args` (`RGXGroupTokenArgs`, optional): An object specifying the group configuration. Defaults to `{}`.
  - `name` (`string | null`, optional): The name of the group for named capture groups. Must be a valid identifier (validated via `assertValidIdentifier`). Defaults to `null`.
  - `capturing` (`boolean`, optional): Whether the group is capturing. Defaults to `true`. Setting this to `false` also clears any `name`.
- `tokens` (`RGXTokenCollectionInput`, optional): The tokens to be wrapped by the group. Internally stored as an `RGXTokenCollection` in 'concat' mode. Defaults to an empty array.

#### Properties
- `tokens` (`RGXTokenCollection`): The internal collection of tokens managed in 'concat' mode.
- `name` (`string | null`): The name of the group. Setting this to a non-null value validates it as a valid identifier via `assertValidIdentifier`.
- `capturing` (`boolean`): Whether the group is capturing. Any named group is automatically capturing (returns `true` when `name` is not `null`). Setting this to `false` also clears `name` to `null`.
- `rgxIsGroup` (`true`): Returns `true` as a constant, indicating this token represents a group.
- `rgxGroupWrap` (`false`): Returns `false` as a constant, since the group already wraps itself, preventing the resolver from double-wrapping.

#### Methods
- `toRgx() => RegExp`: Resolves the group by concatenating the internal tokens and wrapping the result in the appropriate group syntax: `(?<name>...)` for named groups, `(?:...)` for non-capturing groups, or `(...)` for capturing groups.

### RGXRepeatToken extends RGXClassToken
A class representing a repetition quantifier wrapping an RGX token. This allows specifying how many times a token should be matched (e.g., exactly N times, between N and M times, or unlimited). This is typically created via the `repeat()` or `optional()` methods on `RGXClassToken`, but can also be instantiated directly.

A function `rgxRepeat` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

#### Static Properties
- `check(value: unknown): value is RGXRepeatToken`: A type guard that checks if the given value is an instance of `RGXRepeatToken`.
- `assert(value: unknown): asserts value is RGXRepeatToken`: An assertion that checks if the given value is an instance of `RGXRepeatToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Constructor
```typescript
constructor(token: RGXToken, min?: number, max?: number | null, lazy?: boolean)
```
- `token` (`RGXToken`): The token to repeat. If the token is not already a grouped token, it will be automatically wrapped in a non-capturing `RGXGroupToken`.
- `min` (`number`, optional): The minimum number of repetitions. Must be >= 0 and <= `max` (when `max` is not `null`). Non-integer values are floored. Defaults to `1`.
- `max` (`number | null`, optional): The maximum number of repetitions. Must be >= `min` when not `null`. Non-integer values are floored. Pass `null` for unlimited repetitions. Defaults to `min`.
- `lazy` (`boolean`, optional): Whether the quantifier should be non-greedy (lazy). Defaults to `false`.

#### Properties
- `token` (`RGXGroupedToken`): The token being repeated. Setting this will throw `RGXNotSupportedError` if the value is a convertible token with `rgxIsRepeatable` set to `false`, and will automatically wrap non-grouped tokens in a non-capturing `RGXGroupToken`.
- `min` (`number`): The minimum number of repetitions. Setting this validates that the value is >= 0 and <= `max` (when `max` is not `null`), and floors non-integer values. Throws `RGXOutOfBoundsError` if validation fails.
- `max` (`number | null`): The maximum number of repetitions. Setting this validates that the value is >= `min` when not `null`, and floors non-integer values. Pass `null` for unlimited. Throws `RGXOutOfBoundsError` if validation fails.
- `lazy` (`boolean`): Whether the quantifier is non-greedy (lazy). When `true`, a `?` is appended to the `repeaterSuffix` (except when the suffix is `?` or empty, since those cases don't benefit from a lazy modifier). Defaults to `false`.
- `repeaterSuffix` (`string`): Returns the regex quantifier suffix based on the current `min`, `max`, and `lazy` values: `*` for `{0,}`, `+` for `{1,}`, `?` for `{0,1}`, `{n}` for exact repetitions, `{n,}` for minimum-only, `{n,m}` for a range, or an empty string for `{1,1}` (exactly once, no quantifier needed). When `lazy` is `true`, a `?` is appended to the suffix (e.g., `*?`, `+?`, `{2,5}?`), except when the suffix is already `?` or empty.
- `rgxGroupWrap` (`false`): Returns `false` as a constant, since the quantifier suffix binds tightly to the preceding group and does not need additional wrapping.

#### Methods
- `toRgx() => RGXToken`: Resolves the repeat token to a `RegExp` by resolving the inner token and appending the `repeaterSuffix`. Returns `null` (a no-op) when both `min` and `max` are `0`.

### RGXLookaroundToken extends RGXClassToken (abstract)
An abstract base class for lookaround assertion tokens (lookahead and lookbehind). Lookaround assertions match a pattern without consuming characters in the string. Subclasses must implement the `toRgx()`, `negate()`, and `reverse()` methods.

#### Static Properties
- `check(value: unknown): value is RGXLookaroundToken`: A type guard that checks if the given value is an instance of `RGXLookaroundToken`.
- `assert(value: unknown): asserts value is RGXLookaroundToken`: An assertion that checks if the given value is an instance of `RGXLookaroundToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Constructor
```typescript
constructor(tokens?: RGXTokenCollectionInput, positive?: boolean)
```
- `tokens` (`RGXTokenCollectionInput`, optional): The tokens to include in the lookaround. Internally stored as an `RGXTokenCollection` in 'concat' mode. Defaults to an empty array.
- `positive` (`boolean`, optional): Whether the lookaround is positive (matches if the pattern is present) or negative (matches if the pattern is absent). Defaults to `true`.

#### Properties
- `tokens` (`RGXTokenCollection`): The internal collection of tokens managed in 'concat' mode.
- `positive` (`boolean`): Whether the lookaround is positive. Setting this updates `negative` accordingly.
- `negative` (`boolean`): Whether the lookaround is negative. Setting this updates `positive` accordingly.
- `rgxIsGroup` (`true`): Returns `true` as a constant, indicating this token represents a group.
- `rgxIsRepeatable` (`false`): Returns `false` as a constant, since lookaround assertions cannot be repeated.
- `rgxGroupWrap` (`false`): Returns `false` as a constant, since the lookaround already wraps itself in a group.

#### Abstract Methods
- `negate() => RGXLookaroundToken`: Returns a new lookaround token of the same type with the opposite positivity, preserving the original tokens.
- `reverse() => RGXLookaroundToken`: Returns a new lookaround token of the opposite direction (lookahead becomes lookbehind and vice versa), preserving the original tokens and positivity.

### RGXLookaheadToken extends RGXLookaroundToken
A class representing a lookahead assertion. Positive lookaheads (`(?=...)`) match if the pattern is present ahead, while negative lookaheads (`(?!...)`) match if the pattern is absent. This is typically created via the `asLookahead()` method on `RGXClassToken`, but can also be instantiated directly.

A function `rgxLookahead` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

#### Static Properties
- `check(value: unknown): value is RGXLookaheadToken`: A type guard that checks if the given value is an instance of `RGXLookaheadToken`.
- `assert(value: unknown): asserts value is RGXLookaheadToken`: An assertion that checks if the given value is an instance of `RGXLookaheadToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Methods
- `negate() => RGXLookaheadToken`: Returns a new `RGXLookaheadToken` with the opposite positivity, preserving the original tokens.
- `reverse() => RGXLookbehindToken`: Returns a new `RGXLookbehindToken` with the same tokens and positivity.
- `toRgx() => RegExp`: Resolves the lookahead to a `RegExp`. Positive lookaheads produce `(?=...)` and negative lookaheads produce `(?!...)`.

### RGXLookbehindToken extends RGXLookaroundToken
A class representing a lookbehind assertion. Positive lookbehinds (`(?<=...)`) match if the pattern is present behind, while negative lookbehinds (`(?<!...)`) match if the pattern is absent. This is typically created via the `asLookbehind()` method on `RGXClassToken`, but can also be instantiated directly.

A function `rgxLookbehind` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

#### Static Properties
- `check(value: unknown): value is RGXLookbehindToken`: A type guard that checks if the given value is an instance of `RGXLookbehindToken`.
- `assert(value: unknown): asserts value is RGXLookbehindToken`: An assertion that checks if the given value is an instance of `RGXLookbehindToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Methods
- `negate() => RGXLookbehindToken`: Returns a new `RGXLookbehindToken` with the opposite positivity, preserving the original tokens.
- `reverse() => RGXLookaheadToken`: Returns a new `RGXLookaheadToken` with the same tokens and positivity.
- `toRgx() => RegExp`: Resolves the lookbehind to a `RegExp`. Positive lookbehinds produce `(?<=...)` and negative lookbehinds produce `(?<!...)`.

### RGXSubpatternToken extends RGXClassToken
A class representing a backreference to a previously captured group, either by name or by group number. Named backreferences produce `\k<name>` and numbered backreferences produce `\N` (where N is the group number). This is useful for matching the same text that was captured by a previous group.

A function `rgxSubpattern` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

#### Static Properties
- `check(value: unknown): value is RGXSubpatternToken`: A type guard that checks if the given value is an instance of `RGXSubpatternToken`.
- `assert(value: unknown): asserts value is RGXSubpatternToken`: An assertion that checks if the given value is an instance of `RGXSubpatternToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Constructor
```typescript
constructor(pattern: string | number)
```
- `pattern` (`string | number`): The backreference pattern. If a string, it must be a valid identifier (validated via `assertValidIdentifier`) and produces a named backreference (`\k<name>`). If a number, it must be a positive integer (>= 1, as groups are 1-indexed) and produces a numbered backreference (`\N`). Non-integer numbers are floored.

#### Properties
- `pattern` (`string | number`): The backreference pattern. Setting this validates the value: strings must be valid identifiers, numbers must be positive integers (>= 1). Non-integer numbers are floored.

#### Methods
- `toRgx() => RegExp`: Resolves the backreference to a `RegExp`. Named patterns produce `/\k<name>/` and numbered patterns produce `/\N/`.
- `clone(depth: CloneDepth = "max") => RGXSubpatternToken`: Creates a clone of this token. When `depth` is `0`, returns `this`; otherwise, returns a new `RGXSubpatternToken` with the same pattern.

### RGXClassWrapperToken extends RGXClassToken
A class that wraps any `RGXToken` as an `RGXClassToken`, giving you access to the extended API class tokens provide. It delegates `rgxIsGroup` and `rgxIsRepeatable` to the wrapped token where possible.

A function `rgxClassWrapper` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

#### Static Properties
- `check(value: unknown): value is RGXClassWrapperToken`: A type guard that checks if the given value is an instance of `RGXClassWrapperToken`.
- `assert(value: unknown): asserts value is RGXClassWrapperToken`: An assertion that checks if the given value is an instance of `RGXClassWrapperToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Constructor
```typescript
constructor(token: RGXToken)
```
- `token` (`RGXToken`): The token to wrap.

#### Properties
- `token` (`RGXToken`): The wrapped token.
- `rgxIsGroup` (`boolean`): Delegates to the wrapped token's group status via `isRGXGroupedToken`. Returns `true` if the wrapped token is a grouped token, otherwise `false`.
- `rgxIsRepeatable` (`boolean`): If the wrapped token is an `RGXConvertibleToken`, delegates to its `rgxIsRepeatable` property (defaulting to `true` if not present). Otherwise, returns `true`.

#### Methods
- `unwrap() => RGXToken`: Returns the original wrapped token.
- `toRgx() => RGXToken`: Returns the original wrapped token (alias for `unwrap()`).

### ExtRegExp extends RegExp
A subclass of `RegExp` that supports custom flag transformers in addition to the standard vanilla regex flags (g, i, m, s, u, y). When constructed, custom flags are extracted, their corresponding transformers are applied to the pattern and vanilla flags, and the resulting transformed `RegExp` is created. The `flags` getter returns both the vanilla flags and any custom flags.

A function `extRegExp` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

#### Constructor
```typescript
constructor(pattern: string | RegExp, flags?: string)
```
- `pattern` (`string | RegExp`): The regex pattern. If a `RegExp` is provided, its `source` is used and its existing `flags` are tracked as already-applied flags to avoid re-applying transformers.
- `flags` (`string`, optional): The flags string, which may include both vanilla regex flags and custom registered flag keys. Validated via `assertValidRegexFlags`. Defaults to `''`.

#### Properties
- `flags` (`string`): Returns the combination of the vanilla flags (from the underlying `RegExp`) and any custom flags that were applied during construction.

#### Static Properties
- `[Symbol.species]` (`RegExpConstructor`): Returns `ExtRegExp`, ensuring that derived `RegExp` methods (like those returning new regex instances) produce `ExtRegExp` instances rather than plain `RegExp`.

### RGXPart\<R, T=string\>
A class that wraps an `RGXToken` with optional callbacks for use within an `RGXWalker`. It implements `RGXConvertibleToken`, delegating `rgxIsGroup` and `rgxIsRepeatable` to the wrapped token. Unlike plain tokens, Parts can control walker behavior via `beforeCapture` (returning an `RGXPartControl` value) and react to captures via `afterCapture`. Parts are purely definitions and do not store capture state — all captures are stored on the walker as `RGXCapture` objects.

A function `rgxPart` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

#### Static Properties
- `check(value: unknown): value is RGXPart`: A type guard that checks if the given value is an instance of `RGXPart`.
- `assert(value: unknown): asserts value is RGXPart`: An assertion that checks if the given value is an instance of `RGXPart`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Constructor
```typescript
constructor(token: RGXToken, options?: Partial<RGXPartOptions<R, T>>)
```
- `token` (`RGXToken`): The token to wrap.
- `options` (`Partial<RGXPartOptions<R, T>>`, optional): Configuration options. Defaults to `{}`.
  - `transform` (`(captured: string) => T`, optional): A function that transforms the captured string into the desired type `T`. Defaults to an identity function that casts the string to `T`.
  - `beforeCapture` (`((part: RGXPart<R, T>, walker: RGXWalker<R>) => RGXPartControl) | null`, optional): A callback invoked before capturing this part during walking. Returns an `RGXPartControl` value to control walker behavior: `"skip"` to skip this token without capturing, `"silent"` to capture but not record in `captures`, `"stop"` to halt immediately without capturing or advancing, or `void`/`undefined` to proceed normally. Defaults to `null`.
  - `afterCapture` (`((capture: RGXCapture<T>, part: RGXPart<R, T>, walker: RGXWalker<R>) => void) | null`, optional): A callback invoked after capturing this part during walking. Receives the typed `RGXCapture<T>` result. Can call `walker.stop()` to halt walking after this capture. Defaults to `null`.
  - `validate` (`((capture: RGXCapture<T>, walker: RGXWalker<R>) => boolean | string) | null`, optional): A callback invoked during validation after capturing and transforming, but before `afterCapture`. Returns `true` if validation passes, `false` to fail with a generic error, or a string to fail with that string as the error message. Defaults to `null`.

#### Properties
- `token` (`RGXToken`): The wrapped token.
- `transform` (`(captured: string) => T`, readonly): The transform function used to convert captured strings to values of type `T`.
- `beforeCapture` (`((part: RGXPart<R, T>, walker: RGXWalker<R>) => RGXPartControl) | null`, readonly): The before-capture callback, or `null`.
- `afterCapture` (`((capture: RGXCapture<T>, part: RGXPart<R, T>, walker: RGXWalker<R>) => void) | null`, readonly): The after-capture callback, or `null`.
- `rgxIsGroup` (`boolean`): Delegates to the wrapped token's group status via `isRGXGroupedToken`.
- `rgxIsRepeatable` (`boolean`): If the wrapped token is an `RGXConvertibleToken`, delegates to its `rgxIsRepeatable` property (defaulting to `true` if not present). Otherwise, returns `true`.

#### Methods
- `toRgx() => RGXToken`: Returns the wrapped token.
- `clone(depth: CloneDepth = "max") => RGXPart`: Creates a clone of this part. When `depth` is `0`, returns `this`; otherwise, returns a new `RGXPart` with a cloned token and the same `transform`, `beforeCapture`, and `afterCapture` references.
- `validate(capture: RGXCapture<T>, walker: RGXWalker<R>) => void`: A method that calls the inner passed validation logic for this part, if any. If it returns `false`, a generic `RGXPartValidationFailedError` is thrown. If it returns a string, an `RGXPartValidationFailedError` is thrown with that string as the message. If it returns `true`, validation passed. This is called internally by the walker after capturing and transforming a part, before invoking `afterCapture`.

### RGXWalker\<R\>
A class that walks through a sequence of RGX tokens, matching each token against a source string at the current position. It implements `RGXConvertibleToken`, delegating to its internal `RGXTokenCollection`. The walker maintains a source position and a token position, advancing through both as tokens are matched. When an `RGXPart` is encountered, its `beforeCapture` callback can control behavior via return values (`RGXPartControl`), and its `afterCapture` callback is invoked with the typed capture result. All captures are stored as structured `RGXCapture` objects on the walker. The generic type `R` represents a user-defined "reduced" value that can accumulate state during walking (e.g., via `RGXPart` callbacks).

A function `rgxWalker` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

#### Static Properties
- `check(value: unknown): value is RGXWalker`: A type guard that checks if the given value is an instance of `RGXWalker`.
- `assert(value: unknown): asserts value is RGXWalker`: An assertion that checks if the given value is an instance of `RGXWalker`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Constructor
```typescript
constructor(source: string, tokens: RGXTokenCollectionInput, options?: RGXWalkerOptions<R>)
```
- `source` (`string`): The string to walk through, matching tokens against.
- `tokens` (`RGXTokenCollectionInput`): The tokens to match sequentially. Internally stored as an `RGXTokenCollection` in 'concat' mode.
- `options` (`RGXWalkerOptions<R>`, optional): Configuration options. Defaults to `{}`.
  - `startingSourcePosition` (`number`, optional): The starting index in the source string. Defaults to `0`.
  - `reduced` (`R`, optional): The initial value for the `reduced` accumulator. Defaults to `null`.

#### Properties
- `source` (`string`): The source string being walked (readonly).
- `sourcePosition` (`number`): The current index in the source string. Range is `[0, source.length]` inclusive, where `source.length` represents "fully consumed". Setting this validates that the value is >= 0 and <= `source.length`, throwing `RGXOutOfBoundsError` if not.
- `tokens` (`RGXTokenCollection`): The internal collection of tokens in 'concat' mode (readonly).
- `tokenPosition` (`number`): The current index in the token collection. Setting this validates that the value is >= 0 and <= `tokens.length`, throwing `RGXOutOfBoundsError` if not.
- `reduced` (`R`): A user-defined accumulator value, typically updated by `RGXPart` callbacks during walking.
- `captures` (`RGXCapture[]`): An array of structured capture results recorded during walking. Each entry has a `raw` string and a `value` (the transform result for Parts, or the raw string for plain tokens).
- `stopped` (`boolean`, readonly): Whether the walker has been stopped, either by a Part's `beforeCapture` returning `"stop"` or by calling `stop()` in an `afterCapture` callback.

#### Methods
- `stop() => void`: Sets `stopped` to `true`, causing any active `stepToToken`, `stepToPart`, or `walk` loop to halt after the current iteration. Typically called from an `afterCapture` callback to stop walking after the current capture.
- `atTokenEnd() => boolean`: Returns `true` if the token position is at or past the end of the token collection.
- `hasNextToken(predicate?: (token: RGXToken) => boolean) => boolean`: Returns `true` if there is a current token and it satisfies the optional predicate (defaults to `() => true`).
- `atSourceEnd() => boolean`: Returns `true` if the source has been fully consumed (`sourcePosition >= source.length`).
- `hasNextSource(predicate?: (rest: string) => boolean) => boolean`: Returns `true` if the source is not fully consumed and the remaining source satisfies the optional predicate (defaults to `() => true`).
- `lastCapture() => RGXCapture | null`: Returns the last entry in `captures`, or `null` if empty.
- `currentToken() => RGXToken | null`: Returns the token at the current token position, or `null` if at the end.
- `remainingSource() => string | null`: Returns the remaining source string from the current position onward, or `null` if the source is fully consumed.
- `capture(token: RGXToken) => string`: Resolves the token to a regex, asserts that it matches at the current source position (throwing `RGXRegexNotMatchedAtPositionError` if not), and advances the source position by the match length. Returns the matched string.
- `step() => RGXCapture | null`: Steps through the next token in the collection. If the token is an `RGXPart`, calls `beforeCapture` first — if it returns `"stop"`, sets `stopped` and returns `null` without advancing; if `"skip"`, advances the token position and returns `null` without capturing; if `"silent"`, captures but does not add to `captures`. After capturing, validates. After validating, calls `afterCapture` if present. Returns the `RGXCapture` result, or `null` if there are no more tokens, the step was skipped, or the walker was stopped.
- `stepToToken(predicate: (token: RGXToken) => boolean) => void`: Steps through tokens until the predicate returns `true` for the current token or the walker is stopped. The matching token is not consumed.
- `stepToPart(predicate?: (part: RGXPart<R>) => boolean) => void`: Steps through tokens until the next `RGXPart` satisfying the predicate is reached. If already at a Part, steps once first to move past it. The matching Part is not consumed.
- `walk() => void`: Steps through all remaining tokens until the end of the token collection or the walker is stopped.
- `toRgx() => RGXToken`: Returns the internal `RGXTokenCollection`, allowing the walker to be used as a convertible token.
- `clone(depth: CloneDepth = "max") => RGXWalker`: Creates a clone of the walker. When `depth` is `0`, returns `this`; otherwise, creates a new `RGXWalker` with cloned tokens, source position, reduced value, captures, and stopped state.

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
function isRGXConvertibleToken(value: unknown, returnCheck?: boolean): value is RGXConvertibleToken
```

Checks if the given value is a convertible token (an object with a `toRgx` method). If the `rgxGroupWrap`, `rgxIsRepeatable`, or `rgxIsGroup` properties are present, they must be booleans; otherwise, the check fails. If the `rgxAcceptInsertion` property is present, it must be a callable that returns a `string` or `boolean`; otherwise, the check fails. Validates that `toRgx` is callable and returns a valid `RGXToken` (which can be any RGX token type, including other convertible tokens, allowing for recursive structures). When `returnCheck` is `false`, only checks for the presence and callability of function properties instead of also checking their return values.

#### Parameters
  - `value` (`unknown`): The value to check.
  - `returnCheck` (`boolean`, optional): Whether to validate the return value of the `toRgx` method. Defaults to `true`. When `false`, only checks that `toRgx` exists and is callable. **Note**: Setting this to `false` makes the type guard assertion strictly unsafe, as it doesn't verify that the methods actually return valid values. However, depending on the type of the value you're checking, you might not need that safety (e.g., when checking values that you know are valid based on other context).

#### Returns
- `boolean`: `true` if the value is a convertible token, otherwise `false`.

### assertRGXConvertibleToken
```typescript
function assertRGXConvertibleToken(value: unknown, returnCheck?: boolean): asserts value is RGXConvertibleToken
```
Asserts that the given value is a convertible token (an object with a `toRgx` method). If the `rgxGroupWrap`, `rgxIsRepeatable`, or `rgxIsGroup` properties are present, they must be booleans; otherwise, the assertion fails. If the `rgxAcceptInsertion` property is present, it must be a callable that returns a `string` or `boolean`; otherwise, the assertion fails. When `returnCheck` is `true` (the default), also validates that `toRgx` is callable and returns a valid `RGXToken` (which can be any RGX token type, including other convertible tokens, allowing for recursive structures). If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Parameters
  - `value` (`unknown`): The value to assert.
  - `returnCheck` (`boolean`, optional): Whether to validate the return value of the `toRgx` method. Defaults to `true`. When `false`, only checks that `toRgx` exists and is callable. **Note**: Setting this to `false` makes the type guard assertion strictly unsafe, as it doesn't verify that the `toRgx` method actually returns a valid `RGXToken`. However, depending on the type of the value you're asserting, you might not need that safety (e.g., when asserting values that you know are valid based on other context).

#### Returns
- `void`: This function does not return a value, but will throw an error if the assertion fails.

### isRGXArrayToken
```typescript
function isRGXArrayToken(value: unknown, contentCheck?: boolean): value is RGXToken[]
```
Checks if the given value is an array of RGX tokens. When `contentCheck` is `true` (the default), validates that the value is an array and that every element is a valid RGX token (of any type, including nested arrays). When `contentCheck` is `false`, only checks that the value is an array without validating the contents.

#### Parameters
  - `value` (`unknown`): The value to check.
  - `contentCheck` (`boolean`, optional): Whether to validate that every element is a valid RGX token. Defaults to `true`. When `false`, only checks that the value is an array. **Note**: Setting this to `false` makes the type guard assertion strictly unsafe, as it doesn't verify that the array elements are actually valid `RGXToken` values. However, depending on the context, you might not need that safety (e.g., when checking arrays that you know are valid based on other validation).

#### Returns
- `boolean`: `true` if the value is an array of RGX tokens (or just an array when `contentCheck` is `false`), otherwise `false`.

### assertRGXArrayToken
```typescript
function assertRGXArrayToken(value: unknown, contentCheck?: boolean): asserts value is RGXToken[]
```
Asserts that the given value is an array of RGX tokens. When `contentCheck` is `true` (the default), validates that the value is an array and that every element is a valid RGX token (of any type, including nested arrays). When `contentCheck` is `false`, only checks that the value is an array without validating the contents. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Parameters
  - `value` (`unknown`): The value to assert.
  - `contentCheck` (`boolean`, optional): Whether to validate that every element is a valid RGX token. Defaults to `true`. When `false`, only checks that the value is an array. **Note**: Setting this to `false` makes the type guard assertion strictly unsafe, as it doesn't verify that the array elements are actually valid `RGXToken` values. However, depending on the context, you might not need that safety (e.g., when asserting arrays that you know are valid based on other validation).

#### Returns
- `void`: This function does not return a value, but will throw an error if the assertion fails.

### rgxTokenType
```typescript
function rgxTokenType(value: unknown, recognizeClass?: boolean): RGXTokenType
```

Determines the type of a given RGX token value (`no-op`, `literal`, `native`, `convertible`, `class`, or an array of the former) or throws an error if the value is not a valid RGX token.

When `recognizeClass` is `true` (the default), `RGXClassToken` instances are identified as `'class'` rather than `'convertible'`. When `recognizeClass` is `false`, class tokens are identified as `'convertible'` instead. The `recognizeClass` preference is passed through to recursive calls for array elements.

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
  - `value` (`unknown`): The value to check.
  - `recognizeClass` (`boolean`, optional): Whether to recognize `RGXClassToken` instances as `'class'` instead of `'convertible'`. Defaults to `true`.

#### Returns
- `RGXTokenType`: The type of the RGX token.

### rgxTokenTypeFlat
```typescript
function rgxTokenTypeFlat(value: unknown, recognizeClass?: boolean): RGXTokenTypeFlat
```
Determines the flat type of a given RGX token value (`no-op`, `literal`, `native`, `convertible`, `class`, or `array`) or throws an error if the value is not a valid RGX token. The `array` type represents any array of RGX tokens, regardless of the types of the individual tokens within the array.

When `recognizeClass` is `true` (the default), `RGXClassToken` instances are identified as `'class'` rather than `'convertible'`. This distinction is important because class tokens are also convertible tokens, but the `'class'` type is more specific. When `recognizeClass` is `false`, class tokens are identified as `'convertible'` instead.

If you narrow the result of this function to something more specific, you can then convert these string literals into their corresponding token types using the `RGXTokenFromType` utility type or `rgxTokenFromType` function.

```typescript
const token: RGXToken = ...;
const type = rgxTokenTypeFlat(token);
if (type === 'array') {
    const narrowedToken1 = token as RGXTokenFromType<typeof type>; // narrowedToken is RGXToken[]
    const narrowedToken2 = rgxTokenFromType(type, token); // same as above
}
```

#### Parameters
  - `value` (`unknown`): The value to check.
  - `recognizeClass` (`boolean`, optional): Whether to recognize `RGXClassToken` instances as `'class'` instead of `'convertible'`. Defaults to `true`.

#### Returns
- `RGXTokenTypeFlat`: The flat type of the RGX token.

### rgxTokenFromType
```typescript
function rgxTokenFromType<T extends RGXTokenTypeGuardInput>(type: T, value: RGXToken): RGXTokenFromType<T>
```

Does nothing at runtime, but performs a type assertion to the correct subset of `RGXToken` based on the provided `RGXTokenType`.

#### Parameters
  - `type` (`T`): The RGX token type to assert to.
  - `value` (`RGXToken`): The RGX token to assert.

#### Returns
- `RGXTokenFromType<T>`: The input value, but with its type asserted to the corresponding token type based on the provided `RGXTokenType`.

### rgxTokenTypeToFlat
```typescript
function rgxTokenTypeToFlat(type: RGXTokenType): RGXTokenTypeFlat
```

Converts an `RGXTokenType` to its flat equivalent `RGXTokenTypeFlat`. If the type is an array, it returns `'array'`; otherwise, it returns the type as-is.

#### Parameters
  - `type` (`RGXTokenType`): The RGX token type to convert.

#### Returns
- `RGXTokenTypeFlat`: The flat equivalent of the provided token type.

### rgxTokenTypeGuardInputToFlat
```typescript
function rgxTokenTypeGuardInputToFlat(type: RGXTokenTypeGuardInput): RGXTokenTypeFlat | null
```

Converts an `RGXTokenTypeGuardInput` to its flat equivalent. If the type is `null`, it returns `null`; if it is an array, it returns `'array'`; if it is an `RGXClassTokenConstructor` (a constructor for an `RGXClassToken` subclass), it returns `'class'` (making it slightly lossy in that case); otherwise, it returns the type as-is.

#### Parameters
  - `type` (`RGXTokenTypeGuardInput`): The type guard input to convert.

#### Returns
- `RGXTokenTypeFlat | null`: The flat equivalent of the provided type guard input, or `null` if the input is `null`.

### isRGXToken
```typescript
function isRGXToken<T extends RGXTokenTypeGuardInput = null>(value: unknown, type?: T, matchLength?: boolean): value is RGXTokenFromType<T>
```

Checks if the given value is a valid RGX token, optionally narrowed to a specific token type. When `type` is `null` (the default), it checks against all token types. When `type` is a specific token type string, it checks only against that type. The `'class'` type matches `RGXClassToken` instances specifically, while `'convertible'` also matches class tokens since they implement the convertible interface.

When `type` is a constructor, it performs an `instanceof` check against that specific constructor, allowing you to narrow to a specific class token subclass rather than all class tokens. In this case, `RGXTokenFromType` resolves to `InstanceType<T>`, giving you the specific subclass type.

When `type` is an array, it checks that every element of the value array is a valid RGX token matching the corresponding type in the `type` array. If `matchLength` is `true` (the default), it also requires that the value array has the same length as the type array; if `false`, it allows the value array to be longer than the type array, as long as all elements up to the length of the type array match and all elements after that are still valid RGX tokens of any type.

#### Parameters
  - `value` (`unknown`): The value to check.
  - `type` (`T`, optional): The token type to check against. Can be a token type string, `null` (checks against all token types), an `RGXClassTokenConstructor` (checks via `instanceof`), or an array of these. Defaults to `null`.
  - `matchLength` (`boolean`, optional): When `type` is an array, whether to require that the value array has the same length as the type array. Defaults to `true`.

#### Returns
- `boolean`: `true` if the value is a valid RGX token matching the specified type, otherwise `false`.

### assertRGXToken
```typescript
function assertRGXToken<T extends RGXTokenTypeGuardInput = null>(value: unknown, type?: T, matchLength?: boolean): asserts value is RGXTokenFromType<T>
```

Asserts that the given value is a valid RGX token, optionally narrowed to a specific token type (including `'class'` for `RGXClassToken` instances, or a specific `RGXClassTokenConstructor` for `instanceof` checks). Uses the same logic as `isRGXToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Parameters
  - `value` (`unknown`): The value to assert.
  - `type` (`T`, optional): The token type to assert against. Can be a token type string, `null` (checks against all token types), an `RGXClassTokenConstructor` (checks via `instanceof`), or an array of these. Defaults to `null`.
  - `matchLength` (`boolean`, optional): When `type` is an array, whether to require that the value array has the same length as the type array. Defaults to `true`.

#### Returns
- `void`: This function does not return a value, but will throw an error if the assertion fails.

### isRGXGroupedToken
```typescript
function isRGXGroupedToken(value: unknown, contentCheck?: boolean): value is RGXGroupedToken
```

Checks if the given value is a grouped token — a token that is implicitly or explicitly a group. Arrays and literal tokens (`RegExp`) are implicitly groups. Convertible tokens (including class tokens) are groups if they have `rgxIsGroup` set to `true`, or if they have `rgxGroupWrap` set to `true` and their `toRgx()` method returns a grouped token.

#### Parameters
  - `value` (`unknown`): The value to check.
  - `contentCheck` (`boolean`, optional): Whether to validate the contents of array tokens and the return values of convertible tokens. Defaults to `true`. When `false`, arrays are accepted without checking their elements, and convertible tokens with `rgxGroupWrap` set to `true` are accepted without checking their `toRgx()` return value. This has no effect on the `rgxIsGroup` check, which always accepts the token as grouped regardless of `contentCheck`.

#### Returns
- `boolean`: `true` if the value is a grouped token, otherwise `false`.

### assertRGXGroupedToken
```typescript
function assertRGXGroupedToken(value: unknown, contentCheck?: boolean): asserts value is RGXGroupedToken
```

Asserts that the given value is a grouped token. Uses the same logic as `isRGXGroupedToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

#### Parameters
  - `value` (`unknown`): The value to assert.
  - `contentCheck` (`boolean`, optional): Whether to validate the contents of array tokens and the return values of convertible tokens. Defaults to `true`. When `false`, arrays are accepted without checking their elements, and convertible tokens with `rgxGroupWrap` set to `true` are accepted without checking their `toRgx()` return value. This has no effect on the `rgxIsGroup` check, which always accepts the token as grouped regardless of `contentCheck`.

#### Returns
- `void`: This function does not return a value, but will throw an error if the assertion fails.

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

### isValidIdentifier
```typescript
function isValidIdentifier(value: string): value is ValidIdentifier
```
Checks if the given string is a valid identifier, used for group names and backreferences. Valid identifiers contain only letters, digits, dollar signs, and underscores, and cannot start with a digit.

#### Parameters
  - `value` (`string`): The string to check.

#### Returns
- `boolean`: `true` if the string is a valid identifier, otherwise `false`.

### assertValidIdentifier
```typescript
function assertValidIdentifier(value: string): asserts value is ValidIdentifier
```
Asserts that the given string is a valid identifier, used for group names and backreferences. Valid identifiers contain only letters, digits, dollar signs, and underscores, and cannot start with a digit. If the assertion fails, an `RGXInvalidIdentifierError` will be thrown.

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
function resolveRGXToken(token: RGXToken, groupWrap?: boolean, topLevel?: boolean, currentFlags?: string): ValidRegexString
```

Resolves an RGX token to a string. No-op tokens resolve to an empty string, literal tokens are included as-is (wrapped in a non-capturing group when `groupWrap` is `true`), native tokens are converted to strings and escaped, convertible tokens are converted using their `toRgx` method and then resolved recursively, and arrays of tokens are resolved as unions of their resolved elements (repeats removed, placed in a non-capturing group when `groupWrap` is `true`).

For literal tokens (`RegExp` instances), if the token's flags differ from `currentFlags` in any of the localizable flags (`i`, `m`, `s`), the token is wrapped in an inline modifier group (e.g., `(?i:...)`, `(?-i:...)`, `(?ms-i:...)`) instead of a plain non-capturing group. Non-localizable flags (such as `g`, `u`, `y`, `d`, `v`) are ignored when computing the diff. When an inline modifier group is used, it always wraps the token regardless of the `groupWrap` setting, since the modifier group itself serves as a group.

For convertible tokens, if the token has an `rgxGroupWrap` property, that value always takes precedence. If `rgxGroupWrap` is not present, the behavior depends on whether the call is top-level: at the top level, the `groupWrap` parameter is passed through; in recursive calls, it falls back to `true` regardless of the `groupWrap` parameter. This ensures that the caller's `groupWrap` preference only affects the outermost convertible token and does not leak into deeply nested resolution.

#### Parameters
  - `token` (`RGXToken`): The RGX token to resolve.
  - `groupWrap` (`boolean`, optional): Whether to wrap literal tokens and array unions in non-capturing groups (`(?:...)`). Defaults to `true`. When `false`, literals use their raw source and array unions omit the wrapping group. For convertible tokens, the token's `rgxGroupWrap` property always takes precedence; otherwise, this value is only passed through at the top level (in recursive calls it falls back to `true`). Array union elements always use `groupWrap=true` internally. Note that when a literal token requires an inline modifier group due to a localizable flag diff, it is always wrapped regardless of this setting.
  - `topLevel` (`boolean`, optional): Tracks whether the current call is the initial (top-level) invocation. Defaults to `true`. **Warning**: This parameter is intended for internal use by the resolver's own recursion. External callers should not set this parameter, as doing so may produce unexpected wrapping behavior.
  - `currentFlags` (`string`, optional): The flags of the current regex context, used to compute inline modifier groups for literal tokens. Defaults to `''`. When a literal token's localizable flags (`i`, `m`, `s`) differ from this value, the resolver wraps the token in an inline modifier group that adds or removes the differing flags locally.

#### Returns
- `ValidRegexString`: The resolved string representation of the RGX token. This is guaranteed to be a valid regex string, as convertible tokens are validated to only produce valid regex strings or arrays of valid regex strings.

### rgxConcat
```typescript
function rgxConcat(tokens: RGXToken[], groupWrap?: boolean, currentFlags?: string): ValidRegexString
```

A helper function that resolves an array of RGX tokens and concatenates their resolved string representations together. This is useful for cases where you want to concatenate multiple tokens without creating a union between them. Before returning, any convertible token in the array that defines `rgxAcceptInsertion` is checked; if it returns `false` or a string, an `RGXInsertionRejectedError` is thrown with details about the reason and exactly where the rejection occurred.

#### Parameters
  - `tokens` (`RGXToken[]`): The array of RGX tokens to resolve and concatenate.
  - `groupWrap` (`boolean`, optional): Whether to wrap individual resolved tokens in non-capturing groups. Passed through to `resolveRGXToken`. Defaults to `true`.
  - `currentFlags` (`string`, optional): The flags of the current regex context, passed through to `resolveRGXToken` as its `currentFlags` parameter. Used to compute inline modifier groups for literal tokens whose localizable flags differ. Defaults to `''`.

#### Returns
- `ValidRegexString`: The concatenated string representation of the resolved RGX tokens. This is guaranteed to be a valid regex string, as it is composed of the resolved forms of RGX tokens, which are all valid regex strings.

### rgx
```typescript
function rgx(flags?: string, multiline?: boolean): (strings: TemplateStringsArray, ...tokens: RGXToken[]) => ExtRegExp
```

Creates and returns a template tag function that constructs an `ExtRegExp` object from the provided template literal with the provided flags. The template literal can contain RGX tokens, which will be resolved and concatenated with the literal parts to form the final regex pattern. Before constructing the pattern, any convertible token that defines `rgxAcceptInsertion` is checked; if it returns `false` or a string, an `RGXInsertionRejectedError` is thrown with details about the reason and exactly where the rejection occurred.

When `multiline` is `true` (the default), the literal string parts of the template are processed to strip newlines, trim leading whitespace from each line, and remove empty lines, then joined together. This allows you to write regex patterns across multiple lines in the source code for readability without the newlines and indentation becoming part of the pattern. Only the literal string parts between tokens are affected — interpolated values (tokens) are preserved as-is, including string tokens passed via `${"..."}`. When `multiline` is `false`, all literal string parts are preserved exactly as written, including newlines and whitespace.

The provided `flags` are passed as `currentFlags` to the resolver, enabling inline modifier groups for any `RegExp` literal tokens whose localizable flags (`i`, `m`, `s`) differ from the parent flags. For example, embedding `/foo/i` in a no-flag context produces `(?i:foo)`, while embedding `/bar/` in an `i`-flag context produces `(?-i:bar)`.

Example usages:
```typescript
const beginning = /^/;
const end = /$/;
const word = /\w+/;
const pattern = rgx()`${beginning}testing ${word}${end}`; // /^testing \w+$/ - matches the string "testing " followed by a word, anchored to the start and end of the string

const optionalDigit = /\d?/;
const pattern2 = rgx()`${beginning}optional digit: ${optionalDigit}${end}`; // /^optional digit: \d?$/ - matches the string "optional digit: " followed by an optional digit, anchored to the start and end of the string

const pattern3 = rgx()`${beginning}value: ${[word, optionalDigit]}${end}`; // /^value: (?:\w+|\d?)$/ - matches the string "value: " followed by either a word or an optional digit, anchored to the start and end of the string

const caseInsensitiveWord = /hello/i;
const pattern4 = rgx()`${beginning}${caseInsensitiveWord} world${end}`; // /^(?i:hello) world$/ - "hello" matches case-insensitively via an inline modifier group, while " world" remains case-sensitive

// Multiline template for readability (multiline is true by default):
const pattern5 = rgx()`
    ${beginning}
    testing ${word}
    ${end}
`; // /^testing \w+$/ - same as pattern, but written across multiple lines

// Preserving literal newlines with multiline mode:
const pattern6 = rgx()`
    foo
    bar${rgxConstant("newline")}
    baz
`; // /foobar\nbaz/ - the constant newline is preserved, but template newlines are stripped
```

#### Parameters
**Direct**
  - `flags` (`string`, optional): The regex flags to apply to the resulting `ExtRegExp` object (e.g., 'g', 'i', 'm', or custom registered flags). If not provided, no flags will be applied. If provided and not valid regex flags (vanilla or registered custom), an `RGXInvalidRegexFlagsError` will be thrown.
  - `multiline` (`boolean`, optional): Whether to strip newlines and trim leading whitespace from the literal string parts of the template. Defaults to `true`. When `true`, each literal string part is split by newlines, each line has its leading whitespace trimmed, empty lines are removed, and the remaining lines are joined together. Interpolated tokens (including string tokens via `${"..."}`) are not affected. When `false`, literal string parts are preserved exactly as written.

**Template Tag**
  - `strings` (`TemplateStringsArray`): The literal parts of the template string.
  - `tokens` (`RGXToken[]`): The RGX tokens to be resolved and concatenated with the literal parts.

#### Returns
- `(strings: TemplateStringsArray, ...tokens: RGXToken[]) => ExtRegExp`: A template tag function that takes a template literal and returns an `ExtRegExp` object constructed from the resolved tokens, literal parts, and the provided flags.

### rgxa
```typescript
function rgxa(tokens: RGXToken[], flags?: string): ExtRegExp
```
As an alternative to using the `rgx` template tag, you can directly call `rgxa` with an array of RGX tokens and optional flags to get an `ExtRegExp` object. This is useful in cases where you don't want to use a template literal. Like `rgx`, the provided `flags` are passed as `currentFlags` to the resolver, enabling inline modifier groups for `RegExp` literal tokens whose localizable flags differ. Before constructing the pattern, any convertible token in the array that defines `rgxAcceptInsertion` is checked; if it returns `false` or a string, an `RGXInsertionRejectedError` is thrown with details about the reason and exactly where the rejection occurred.

#### Parameters
  - `tokens` (`RGXToken[]`): The RGX tokens to be resolved and concatenated to form the regex pattern.
  - `flags` (`string`, optional): The regex flags to apply to the resulting `ExtRegExp` object (e.g., 'g', 'i', 'm', or custom registered flags). If not provided, no flags will be applied. If provided and not valid regex flags (vanilla or registered custom), an `RGXInvalidRegexFlagsError` will be thrown.

#### Returns
- `ExtRegExp`: An `ExtRegExp` object constructed from the resolved tokens and the provided flags.

### expandRgxUnionTokens
```typescript
function expandRgxUnionTokens(...tokens: RGXTokenCollectionInput[]): RGXTokenCollection
```

Recursively expands nested union tokens (arrays, `RGXTokenCollection` instances in union mode, and `RGXClassUnionToken` instances) into a flat `RGXTokenCollection`. This is useful for normalizing a set of union alternatives before deduplication.

#### Parameters
  - `tokens` (`...RGXTokenCollectionInput[]`): The tokens to expand.

#### Returns
- `RGXTokenCollection`: A flat collection containing all expanded tokens.

### removeRgxUnionDuplicates
```typescript
function removeRgxUnionDuplicates(...tokens: RGXTokenCollectionInput[]): RGXTokenCollection
```

Removes duplicate tokens from the provided list using `Set` equality and returns a new `RGXTokenCollection` in union mode containing only the unique tokens.

#### Parameters
  - `tokens` (`...RGXTokenCollectionInput[]`): The tokens to deduplicate.

#### Returns
- `RGXTokenCollection`: A union-mode collection with duplicates removed.

### rgxClassInit
```typescript
function rgxClassInit(): void
```

Initializes internal method patches required for `RGXClassToken` subclass methods (such as `or`, `group`, `repeat`, `asLookahead`, and `asLookbehind`) to work correctly. This function is called automatically when importing from the main module entry point, so you typically do not need to call it yourself. It only needs to be called manually if you import directly from sub-modules.

### toRGXClassToken
```typescript
function toRGXClassToken(token: RGXToken): RGXClassToken
```

Converts any `RGXToken` into an appropriate `RGXClassToken` subclass, giving you access to the extended API that class tokens provide. Tokens that are already class tokens are returned as-is. Array tokens and `RGXTokenCollection` instances in union mode are converted to `RGXClassUnionToken`. `RGXTokenCollection` instances in concat mode are converted to a non-capturing `RGXGroupToken`. All other tokens are wrapped in an `RGXClassWrapperToken`.

#### Parameters
  - `token` (`RGXToken`): The token to convert.

#### Returns
- `RGXClassToken`: The corresponding class token:
  - `RGXClassUnionToken` for array tokens and union-mode `RGXTokenCollection` instances.
  - `RGXGroupToken` (non-capturing) for concat-mode `RGXTokenCollection` instances.
  - `RGXClassWrapperToken` for all other tokens.

### isInRange
```typescript
function isInRange(value: number, { min, max, inclusiveLeft, inclusiveRight }?: RangeObject): boolean
```

Checks if the given numeric value falls within the specified range.

#### Parameters
  - `value` (`number`): The value to check.
  - `min` (`number | null`, optional): The minimum bound of the range. Defaults to `null` (no minimum).
  - `max` (`number | null`, optional): The maximum bound of the range. Defaults to `null` (no maximum).
  - `inclusiveLeft` (`boolean`, optional): Whether the minimum bound is inclusive. Defaults to `true`.
  - `inclusiveRight` (`boolean`, optional): Whether the maximum bound is inclusive. Defaults to `true`.

#### Returns
- `boolean`: `true` if the value is within the specified range, otherwise `false`.

### assertInRange
```typescript
function assertInRange(value: number, range: RangeObject, message?: string): void
```

Asserts that the given numeric value falls within the specified range. If the assertion fails, an `RGXOutOfBoundsError` will be thrown.

#### Parameters
  - `value` (`number`): The value to assert.
  - `range` (`RangeObject`): The range to check against.
  - `message` (`string`, optional): A custom error message. Defaults to `"Value out of bounds"`.

#### Returns
- `void`: This function does not return a value, but will throw an error if the assertion fails.

### isValidRegexFlags
```typescript
function isValidRegexFlags(flags: string): flags is ValidRegexFlags
```

Checks if the given string is a valid combination of regex flags, including both vanilla flags (g, i, m, s, u, y) and any custom flags registered via `registerFlagTransformer`. Custom flag characters are stripped before validating the remaining characters as vanilla flags.

#### Parameters
  - `flags` (`string`): The string to check.

#### Returns
- `boolean`: `true` if the string is a valid combination of regex flags, otherwise `false`.

### assertValidRegexFlags
```typescript
function assertValidRegexFlags(flags: string): asserts flags is ValidRegexFlags
```

Asserts that the given string is a valid combination of regex flags, including both vanilla flags and any custom registered flags. If the assertion fails, an `RGXInvalidRegexFlagsError` will be thrown.

#### Parameters
  - `flags` (`string`): The string to assert.

#### Returns
- `void`: This function does not return a value, but will throw an error if the assertion fails.

### isFlagKeyAvailable
```typescript
function isFlagKeyAvailable(flags: string): boolean
```

Checks if the given string is available for use as a custom flag transformer key. Returns `false` if the string is a vanilla regex flag or if any character in the string is already registered as a custom flag transformer.

#### Parameters
  - `flags` (`string`): The string to check.

#### Returns
- `boolean`: `true` if the string is available for use as a custom flag key, otherwise `false`.

### registerFlagTransformer
```typescript
function registerFlagTransformer(key: string, transformer: RegExpFlagTransformer): void
```

Registers a custom flag transformer under the given single-character key. The key must be exactly one character, must not be a vanilla regex flag, and must not already be registered. When an `ExtRegExp` is constructed with this flag character in its flags string, the transformer function will be called with the `RegExp` to transform it.

#### Parameters
  - `key` (`string`): A single-character string to use as the flag key. Must not be a vanilla regex flag or an already-registered key.
  - `transformer` (`RegExpFlagTransformer`): A function that takes a `RegExp` and returns a transformed `RegExp`.

#### Returns
- `void`: This function does not return a value, but will throw an `RGXInvalidFlagTransformerKeyError` if the key is not a single character, or an `RGXFlagTransformerConflictError` if the key conflicts with a vanilla flag or an existing transformer.

### unregisterFlagTransformer
```typescript
function unregisterFlagTransformer(key: string): void
```

Unregisters a previously registered custom flag transformer by its key. If the key was not registered, this is a no-op.

#### Parameters
  - `key` (`string`): The flag key to unregister.

#### Returns
- `void`: This function does not return a value.

### accentInsensitiveFlagTransformer
```typescript
const accentInsensitiveFlagTransformer: RegExpFlagTransformer
```

A pre-built `RegExpFlagTransformer` that makes a regex pattern accent-insensitive. It replaces any accentable characters (a, e, i, o, u and their uppercase equivalents) in the regex source with alternation groups that match both the base character and its accented variants. For example, `é` becomes `(e|é|è|ë|ê)`. The following accent mappings are supported:

- `a` / `A`: á, à, ä, â, ã / Á, À, Ä, Â, Ã
- `e` / `E`: é, è, ë, ê / É, È, Ë, Ê
- `i` / `I`: í, ì, ï, î / Í, Ì, Ï, Î
- `o` / `O`: ó, ò, ö, ô, õ / Ó, Ò, Ö, Ô, Õ
- `u` / `U`: ú, ù, ü, û / Ú, Ù, Ü, Û

#### Parameters
  - `exp` (`RegExp`): The regular expression to transform.

#### Returns
- `RegExp`: A new `RegExp` with the same flags but with accentable characters in the source replaced by accent-insensitive alternation groups.

### registerCustomFlagTransformers
```typescript
function registerCustomFlagTransformers(): void
```

Registers the library's built-in custom flag transformers. Currently registers the following:
- `"a"` flag: `accentInsensitiveFlagTransformer` — makes patterns accent-insensitive.

This function is called automatically when importing from the main module entry point, so you typically do not need to call it yourself. It only needs to be called manually if you import directly from sub-modules.

#### Returns
- `void`: This function does not return a value.

### unregisterCustomFlagTransformers
```typescript
function unregisterCustomFlagTransformers(): void
```

Unregisters all built-in custom flag transformers that were registered by `registerCustomFlagTransformers`. Currently unregisters the `"a"` flag.

#### Returns
- `void`: This function does not return a value.

### applyFlagTransformers
```typescript
function applyFlagTransformers(regex: RegExp, flags: string, alreadyAppliedFlags?: string): RegExp
```

Applies all registered flag transformers whose keys appear in the given flags string to the provided `RegExp`, returning the resulting transformed `RegExp`. Flags present in `alreadyAppliedFlags` are skipped to avoid re-applying transformers.

#### Parameters
  - `regex` (`RegExp`): The regular expression to transform.
  - `flags` (`string`): The flags string containing custom flag characters to apply.
  - `alreadyAppliedFlags` (`string`, optional): A string of flag characters that have already been applied and should be skipped. Defaults to `''`.

#### Returns
- `RegExp`: The transformed `RegExp` after applying all matching flag transformers.

### extractCustomRegexFlags
```typescript
function extractCustomRegexFlags(flags: string): string
```

Extracts the custom (non-vanilla) flag characters from the given flags string by returning only the characters that correspond to registered flag transformers.

#### Parameters
  - `flags` (`string`): The flags string to extract custom flags from.

#### Returns
- `string`: A string containing only the custom flag characters found in the input.

### extractVanillaRegexFlags
```typescript
function extractVanillaRegexFlags(flags: string): string
```

Extracts the vanilla regex flag characters from the given flags string by removing all characters that correspond to registered flag transformers.

#### Parameters
  - `flags` (`string`): The flags string to extract vanilla flags from.

#### Returns
- `string`: A string with all registered custom flag characters removed, leaving only vanilla flags.

### normalizeRegexFlags
```typescript
function normalizeRegexFlags(flags: string): string
```

Normalizes a string of regex flags (including both vanilla and custom registered flags) by removing duplicate flags while preserving order. If any character in the string is not a valid regex flag (vanilla or registered custom), an `RGXInvalidRegexFlagsError` will be thrown.

#### Parameters
  - `flags` (`string`): The flags string to normalize.

#### Returns
- `string`: The normalized flags string with duplicates removed.

### normalizeVanillaRegexFlags
```typescript
function normalizeVanillaRegexFlags(flags: string): string
```

Normalizes a string of vanilla regex flags by removing duplicate flags while preserving order. First validates that all characters are valid vanilla regex flags (g, i, m, s, u, y), throwing an `RGXInvalidVanillaRegexFlagsError` if any are not, then delegates to `normalizeRegexFlags` for deduplication.

#### Parameters
  - `flags` (`string`): The flags string to normalize.

#### Returns
- `string`: The normalized flags string with duplicates removed.

### regexWithFlags
```typescript
function regexWithFlags(exp: RegExp | ExtRegExp, flags: string, replace?: boolean): ExtRegExp
```

Creates a new `ExtRegExp` from an existing one with additional or replaced flags. When `replace` is `false` (the default), the provided flags are merged with the existing flags and normalized (duplicates removed). When `replace` is `true`, the existing flags are discarded and only the provided flags are used. The provided flags are validated as valid vanilla regex flags via `assertValidVanillaRegexFlags`.

#### Parameters
  - `exp` (`RegExp | ExtRegExp`): The source regular expression.
  - `flags` (`string`): The flags to add or replace with. Must be valid vanilla regex flags, or an `RGXInvalidVanillaRegexFlagsError` will be thrown.
  - `replace` (`boolean`, optional): Whether to replace the existing flags entirely instead of merging. Defaults to `false`.

#### Returns
- `ExtRegExp`: A new `ExtRegExp` with the same source pattern and the resulting flags.

### regexMatchAtPosition
```typescript
function regexMatchAtPosition(regex: RegExp, str: string, position: number): string | null
```

Attempts to match the given regular expression at a specific position in the string and returns the matched string, or `null` if there is no match. This is done by creating a sticky (`y` flag) copy of the regex and setting its `lastIndex` to the desired position. The position must be within the bounds of the string (>= 0 and < string length), or an `RGXOutOfBoundsError` will be thrown.

#### Parameters
  - `regex` (`RegExp`): The regular expression to match.
  - `str` (`string`): The string to match against.
  - `position` (`number`): The zero-based index in the string at which to attempt the match. Must be >= 0 and < `str.length`.

#### Returns
- `string | null`: The matched string if the regex matches at the specified position, otherwise `null`.

### doesRegexMatchAtPosition
```typescript
function doesRegexMatchAtPosition(regex: RegExp, str: string, position: number): boolean
```

Tests whether the given regular expression matches at a specific position in the string. This is a boolean wrapper around `regexMatchAtPosition`, returning `true` if the match is non-null.

#### Parameters
  - `regex` (`RegExp`): The regular expression to test.
  - `str` (`string`): The string to test against.
  - `position` (`number`): The zero-based index in the string at which to test the match. Must be >= 0 and < `str.length`.

#### Returns
- `boolean`: `true` if the regex matches at the specified position, otherwise `false`.

### assertRegexMatchesAtPosition
```typescript
function assertRegexMatchesAtPosition(regex: RegExp, str: string, position: number, contextSize?: number | null): string
```

Asserts that the given regular expression matches at a specific position in the string, throwing an `RGXRegexNotMatchedAtPositionError` if it does not. On success, returns the matched string.

#### Parameters
  - `regex` (`RegExp`): The regular expression to match.
  - `str` (`string`): The string to match against.
  - `position` (`number`): The zero-based index in the string at which to assert the match. Must be >= 0 and < `str.length`.
  - `contextSize` (`number | null`, optional): The number of characters on each side of the position to include in the error's context output. Defaults to `10`.

#### Returns
- `string`: The matched string if the regex matches at the specified position. Throws `RGXRegexNotMatchedAtPositionError` if there is no match.

### cloneRGXToken
```typescript
function cloneRGXTokeN<T extends RGXToken>(token: T, depth: CloneDepth="max"): T
```
Creates a clone of the given RGX token to the given depth, provided that the token is not a no-op or native token.

#### Parameters
  - `token` (`T`): The RGX token to clone. Must not be a no-op or native token, or an error will be thrown.
  - `depth` (`CloneDepth`, optional): The depth to which to clone the token. Can be a number (with 0 resulting in no clone at all and 1 resulting in a shallow clone) or the string `"max"` for a full deep clone. Defaults to `"max"`.

#### Returns
- `T`: The cloned token.

### listRGXConstants
```typescript
function listRGXConstants(): string[]
```

Returns the names of all currently defined RGX constants.

#### Returns
- `string[]`: An array of constant names.

### hasRGXConstant
```typescript
function hasRGXConstant(name: string): boolean
```

Checks if an RGX constant with the given name exists.

#### Parameters
  - `name` (`string`): The constant name to check.

#### Returns
- `boolean`: `true` if the constant exists, otherwise `false`.

### assertHasRGXConstant
```typescript
function assertHasRGXConstant(name: string): void
```

Asserts that an RGX constant with the given name exists. If the assertion fails, an `RGXInvalidConstantKeyError` will be thrown.

#### Parameters
  - `name` (`string`): The constant name to assert.

#### Returns
- `void`: This function does not return a value, but will throw an error if the assertion fails.

### assertNotHasRGXConstant
```typescript
function assertNotHasRGXConstant(name: string): void
```

Asserts that an RGX constant with the given name does not exist. If the assertion fails, an `RGXConstantConflictError` will be thrown.

#### Parameters
  - `name` (`string`): The constant name to assert.

#### Returns
- `void`: This function does not return a value, but will throw an error if the assertion fails.

### defineRGXConstant
```typescript
function defineRGXConstant(name: string, value: RGXToken): RGXToken
```

Defines a new RGX constant with the given name and value. If the value is a native token (string, number, boolean, or no-op), it is automatically wrapped in an `RGXClassWrapperToken` before being stored. This ensures that native-valued constants are not stripped by multiline template processing in `rgx`, since only the literal string parts of the template are affected by multiline mode. Throws an `RGXConstantConflictError` if a constant with the same name already exists.

#### Parameters
  - `name` (`string`): The name for the constant.
  - `value` (`RGXToken`): The token value to associate with the name. Native tokens are automatically wrapped in `RGXClassWrapperToken`.

#### Returns
- `RGXToken`: The stored value (after wrapping, if applicable).

### rgxConstant
```typescript
function rgxConstant(name: string): RGXToken
```

Retrieves the value of an RGX constant by name. Throws an `RGXInvalidConstantKeyError` if no constant with the given name exists.

#### Parameters
  - `name` (`string`): The constant name to retrieve.

#### Returns
- `RGXToken`: The token value associated with the constant name.

### deleteRGXConstant
```typescript
function deleteRGXConstant(name: string): void
```

Deletes an existing RGX constant by name. Throws an `RGXInvalidConstantKeyError` if no constant with the given name exists.

#### Parameters
  - `name` (`string`): The constant name to delete.

#### Returns
- `void`: This function does not return a value, but will throw an error if the constant does not exist.

## Built-in Constants
The library defines the following built-in constants, which are available immediately after import. Each can be retrieved via `rgxConstant(name)`.

### Control Characters
Since these are defined as native tokens (strings), they are automatically wrapped in `RGXClassWrapperToken` by `defineRGXConstant`, ensuring they are preserved in multiline mode.

| Name | Resolves To | Description |
| --- | --- | --- |
| `"newline"` | `\n` | Newline character |
| `"carriage-return"` | `\r` | Carriage return character |
| `"tab"` | `\t` | Tab character |
| `"null"` | `\0` | Null character |
| `"form-feed"` | `\f` | Form feed character |

### Special Characters
| Name | Resolves To | Description |
| --- | --- | --- |
| `"any"` | `.` | Matches any single character (except newline by default) |
| `"start"` | `^` | Start of string anchor |
| `"end"` | `$` | End of string anchor |
| `"word-bound"` | `\b` | Word boundary |
| `"non-word-bound"` | `\B` | Non-word boundary |
| `"word-bound-start"` | `(?<=\W)(?=\w)` | Start of a word |
| `"word-bound-end"` | `(?<=\w)(?=\W)` | End of a word |

### Character Sets
| Name | Resolves To | Description |
| --- | --- | --- |
| `"letter"` | `[a-zA-Z]` | Any letter (uppercase or lowercase) |
| `"lowercase-letter"` | `[a-z]` | Any lowercase letter |
| `"uppercase-letter"` | `[A-Z]` | Any uppercase letter |
| `"non-letter"` | `[^a-zA-Z]` | Any character that is not a letter |
| `"alphanumeric"` | `[a-zA-Z0-9]` | Any letter or digit |
| `"non-alphanumeric"` | `[^a-zA-Z0-9]` | Any character that is not a letter or digit |

### Predefined Character Sets
| Name | Resolves To | Description |
| --- | --- | --- |
| `"digit"` | `\d` | Any digit |
| `"non-digit"` | `\D` | Any non-digit |
| `"whitespace"` | `\s` | Any whitespace character |
| `"non-whitespace"` | `\S` | Any non-whitespace character |
| `"vertical-whitespace"` | `\v` | Vertical whitespace character |
| `"word-char"` | `\w` | Any word character (letter, digit, or underscore) |
| `"non-word-char"` | `\W` | Any non-word character |
| `"backspace"` | `[\b]` | Backspace character |

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