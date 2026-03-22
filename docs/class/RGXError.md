# Type Reference
The following is a reference to types relevant to the classes listed in this file. The full type reference for the library can be found in [type-reference.md](../type-reference.md).

```typescript
type RGXTokenType = 'no-op' | 'literal' | 'native' | 'convertible' | 'class' | RGXTokenType[];
type RGXTokenTypeFlat = Exclude<RGXTokenType, RGXTokenType[]> | "array";

type RGXErrorCode =
    // A series of string literals representing the codes
    // an RGXError can have, e.g. "INVALID_TOKEN_TYPE",
    // "INVALID_REGEX_FLAGS", etc. See src/errors/base.ts
    // for the full list of error codes.
;

type ExpectedTokenType = {
    type: "tokenType";
    values: RGXTokenTypeFlat[];
} | {
    type: "custom";
    values: string[];
};

type RangeObject = {
    min?: number | null;
    max?: number | null;
    inclusiveLeft?: boolean;
    inclusiveRight?: boolean;
};

const validRegexSymbol = Symbol('rgx.ValidRegex');
type ValidRegexBrandSymbol = typeof validRegexSymbol;
type ValidRegexString = Branded<string, [ValidRegexBrandSymbol]>;

const validVanillaRegexFlagsSymbol = Symbol('rgx.ValidVanillaRegexFlags');
type ValidVanillaRegexFlagsBrandSymbol = typeof validVanillaRegexFlagsSymbol;
type ValidVanillaRegexFlags = Branded<string, [ValidVanillaRegexFlagsBrandSymbol]>;

const validRegexFlagsSymbol = Symbol('rgx.ValidRegexFlags');
type ValidRegexFlagsBrandSymbol = typeof validRegexFlagsSymbol;
type ValidRegexFlags = Branded<string, [ValidRegexFlagsBrandSymbol]> | ValidVanillaRegexFlags;

type RegExpFlagTransformer = (exp: RegExp) => [string, string];

const validIdentifierSymbol = Symbol('rgx.ValidIdentifier');
type ValidIdentifierBrandSymbol = typeof validIdentifierSymbol;
type ValidIdentifier = Branded<string, [ValidIdentifierBrandSymbol]>;

type LexemeNotMatchedCauseError = RGXRegexNotMatchedAtPositionError | RGXRegexNotMatchedAfterPositionError | RGXPartValidationFailedError;
type LexemeNotMatchedCause = {
    id: string;
    error: LexemeNotMatchedCauseError;
};
```

# RGXError
A custom error class for RGX-related errors. This can be used to throw specific errors related to RGX token validation or resolution. Every error thrown by this library is an instance of RGXError.

## Constructor
```typescript
constructor(message: string, code?: RGXErrorCode)
```
- `message` (`string`): The error message.
- `code` (`RGXErrorCode`, optional): An optional error code that can be used to categorize the error. If not provided, it defaults to 'UNKNOWN'.

## Properties
- `name` (`string`): The name of the error, which is always 'RGXError' for this class and its subclasses.
- `message` (`string`): The error message provided when the error was created. Setting this sets the internal `_message` property, then getting it calls `calcMessage(this._message)` to allow subclasses to modify the message with additional context.
- `code` (`RGXErrorCode`): The error code associated with the error, which can be used to identify the type of error that occurred.

## Methods
- `calcMessage(message: string) => string`: Given an error message, subclasses can use this to add additional context or formatting to it. This is called whenever the `message` property is accessed.
- `toString() => string`: Returns a formatted string in the format `${name}: ${message}`. Subclasses customize the message portion via internal formatting rather than overriding `toString()` directly, so all `RGXError` subclasses produce consistently formatted strings through this single method.

# Subclasses
There are a number of subclasses of `RGXError` that represent specific error types related to RGX token validation and resolution. Each subclass automatically sets the correct code when instantiated, and may accept additional parameters to provide more context in the error message.

## RGXInvalidTokenError
A specific error class for invalid RGX tokens. This error is thrown when a value fails validation as a specific RGX token type. The error code is set to `INVALID_RGX_TOKEN` on instantiation.

### Constructor
```typescript
constructor(message: string, expected: ExpectedTokenType | null, got: unknown)
```
- `message` (`string`): The error message.
- `expected` (`string`): A human-readable description of the expected token type(s), generated from the `expected` parameter in the constructor. This can be used to provide more informative error messages.
- `got` (`unknown`): The actual value that was received, which failed validation.

### Properties
- `expected` (`string`): A human-readable description of the expected token type(s), generated from the `expected` parameter in the constructor. This can be used to provide more informative error messages.
- `got` (`unknown`): The actual value that was received, which failed validation.

### Methods
- `setExpected(expected: ExpectedTokenType | null) => string`: A method to set the `expected` property after instantiation, which can be used to provide more context in the error message if it wasn't available at the time of construction. This updates the `expected` property.

## RGXInvalidRegexStringError
A specific error class for invalid regex strings. This error is thrown when a string fails validation as a valid regex string. The error code is set to `INVALID_REGEX_STRING` on instantiation.

### Constructor
```typescript
constructor(message: string, got: string, cause: SyntaxError)
```
- `message` (`string`): The error message.
- `got` (`string`): The actual string that was received, which failed validation.
- `cause` (`SyntaxError`): The underlying `SyntaxError` thrown when attempting to construct a `RegExp` from the invalid string.

### Properties
- `got` (`string`): The actual string that was received, which failed validation.
- `cause` (`SyntaxError`): The underlying `SyntaxError` thrown when attempting to construct a `RegExp` from the invalid string. Its message is appended to the formatted error output.

### Type Guards
#### isValidRegexString
```typescript
function isValidRegexString(value: string): value is ValidRegexString
```
Checks if the given string is a valid regular expression by attempting to create a new `RegExp` object with it. If it succeeds, the string is branded as a `ValidRegexString`.
- `value` (`string`): The string to check.

**Returns:** `boolean` - `true` if the string is a valid regular expression, otherwise `false`.

#### assertValidRegexString
```typescript
function assertValidRegexString(value: string): asserts value is ValidRegexString
```
Asserts that the given string is a valid regular expression by attempting to create a new `RegExp` object with it. If it succeeds, the string is branded as a `ValidRegexString`. If it fails, an `RGXInvalidRegexStringError` will be thrown. Note that failure is only detected with a `SyntaxError`. Other errors are rethrown as-is.
- `value` (`string`): The string to assert.

**Returns:** `void` - If the string is a valid regular expression, the function returns without error. If the string is invalid, an `RGXInvalidRegexStringError` is thrown with the provided message and the invalid string.

## RGXInvalidVanillaRegexFlagsError
A specific error class for invalid vanilla regex flags. This error is thrown when a string fails validation as valid vanilla regex flags. The error code is set to `INVALID_VANILLA_REGEX_FLAGS` on instantiation.

### Constructor
```typescript
constructor(message: string, got: string)
```
- `message` (`string`): The error message.
- `got` (`string`): The actual string that was received, which failed validation.

### Properties
- `got` (`string`): The actual string that was received, which failed validation.

### Type Guards
#### isValidVanillaRegexFlags
```typescript
function isValidVanillaRegexFlags(value: string): value is ValidVanillaRegexFlags
```
Checks if the given string is a valid combination of vanilla regex flags (g, i, m, s, u, y, d, v). Each flag can only appear once.
- `value` (`string`): The string to check.

**Returns:** `boolean` - `true` if the string is a valid combination of vanilla regex flags, otherwise `false`.

#### assertValidVanillaRegexFlags
```typescript
function assertValidVanillaRegexFlags(value: string): asserts value is ValidVanillaRegexFlags
```
Asserts that the given string is a valid combination of vanilla regex flags (g, i, m, s, u, y, d, v). Each flag can only appear once. If the assertion fails, an `RGXInvalidVanillaRegexFlagsError` will be thrown.
- `value` (`string`): The string to assert.

**Returns:** `void` - If the string is a valid combination of vanilla regex flags, the function returns without error. If the string is invalid, an `RGXInvalidVanillaRegexFlagsError` is thrown with the provided message and the invalid string.

## RGXInvalidRegexFlagsError
A specific error class for invalid regex flags (including both vanilla and custom registered flags). This error is thrown when a string fails validation as valid regex flags. The error code is set to `INVALID_REGEX_FLAGS` on instantiation.

### Constructor
```typescript
constructor(message: string, got: string)
```
- `message` (`string`): The error message.
- `got` (`string`): The actual string that was received, which failed validation.

### Properties
- `got` (`string`): The actual string that was received, which failed validation.

### Type Guards
#### isValidRegexFlags
```typescript
function isValidRegexFlags(flags: string): flags is ValidRegexFlags
```
Checks if the given string is a valid combination of regex flags, including both vanilla flags (g, i, m, s, u, y, d, v) and any custom flags registered via `registerFlagTransformer`. Custom flag characters are stripped before validating the remaining characters as vanilla flags.
- `flags` (`string`): The string to check.

**Returns:** `boolean` - `true` if the string is a valid combination of regex flags, otherwise `false`.

#### assertValidRegexFlags
```typescript
function assertValidRegexFlags(flags: string): asserts flags is ValidRegexFlags
```
Asserts that the given string is a valid combination of regex flags, including both vanilla flags (g, i, m, s, u, y, d, v) and any custom flags registered via `registerFlagTransformer`. Custom flag characters are stripped before validating the remaining characters as vanilla flags. If the assertion fails, an `RGXInvalidRegexFlagsError` will be thrown.
- `flags` (`string`): The string to assert.

**Returns:** `void` - If the string is a valid combination of regex flags, the function returns without error. If the string is invalid, an `RGXInvalidRegexFlagsError` is thrown with the provided message and the invalid string.

## RGXInvalidIdentifierError
A specific error class for invalid identifiers. This error is thrown when a string fails validation as a valid identifier. The error code is set to `INVALID_IDENTIFIER` on instantiation.

### Constructor
```typescript
constructor(message: string, got: string)
```
- `message` (`string`): The error message.
- `got` (`string`): The actual string that was received, which failed validation.

### Properties
- `got` (`string`): The actual string that was received, which failed validation.

### Type Guards
#### isValidIdentifier
```typescript
function isValidIdentifier(value: string): value is ValidIdentifier
```
Checks if the given string is a valid identifier, used for group names and backreferences. Valid identifiers contain only letters, digits, dollar signs, and underscores, and cannot start with a digit.
- `value` (`string`): The string to check.

**Returns:** `boolean` - `true` if the string is a valid identifier, otherwise `false`.

#### assertValidIdentifier
```typescript
function assertValidIdentifier(value: string): asserts value is ValidIdentifier
```
Asserts that the given string is a valid identifier, used for group names and backreferences. Valid identifiers contain only letters, digits, dollar signs, and underscores, and cannot start with a digit. If the assertion fails, an `RGXInvalidIdentifierError` will be thrown.
- `value` (`string`): The string to assert.

**Returns:** `void` - If the string is a valid identifier, the function returns without error. If the string is invalid, an `RGXInvalidIdentifierError` is thrown with the provided message and the invalid string.

## RGXInvalidFlagTransformerKeyError
A specific error class for invalid flag transformer keys. This error is thrown when an invalid key is provided to `registerFlagTransformer` (e.g., a key that is not a single character). The error code is set to `INVALID_FLAG_TRANSFORMER_KEY` on instantiation.

### Constructor
```typescript
constructor(message: string, got: string)
```
- `message` (`string`): The error message.
- `got` (`string`): The actual key string that was received, which failed validation.

### Properties
- `got` (`string`): The actual key string that was received, which failed validation.

## RGXFlagTransformerConflictError
A specific error class for flag transformer conflicts. This error is thrown when attempting to register a flag transformer with a key that conflicts with an existing vanilla regex flag or an already-registered transformer. The error code is set to `FLAG_TRANSFORMER_CONFLICT` on instantiation.

### Constructor
```typescript
constructor(message: string, got: string)
```
- `message` (`string`): The error message.
- `got` (`string`): The conflicting key string.

### Properties
- `got` (`string`): The conflicting key string.

## RGXNotDirectRegExpError
A specific error class for non-direct `RegExp` instances. This error is thrown by `applyFlagTransformers` when the provided `regex` argument is not a direct instance of `RegExp` (i.e., its prototype is not exactly `RegExp.prototype`), such as an `ExtRegExp`. The error code is set to `NOT_DIRECT_REGEXP` on instantiation.

### Constructor
```typescript
constructor(message: string, gotConstructorName: string)
```
- `message` (`string`): The error message.
- `gotConstructorName` (`string`): The name of the actual constructor of the value that was passed.

### Properties
- `gotConstructorName` (`string`): The name of the actual constructor of the value that was passed. Its value is appended to the formatted error output.

## RGXInvalidConstantKeyError
A specific error class for invalid constant keys. This error is thrown when attempting to access or assert an RGX constant with a name that does not exist. The error code is set to `INVALID_CONSTANT_KEY` on instantiation.

### Constructor
```typescript
constructor(message: string, got: string)
```
- `message` (`string`): The error message.
- `got` (`string`): The constant name that was not found.

### Properties
- `got` (`string`): The constant name that was not found.

## RGXConstantConflictError
A specific error class for constant name conflicts. This error is thrown when attempting to define an RGX constant with a name that is already in use. The error code is set to `CONSTANT_CONFLICT` on instantiation.

### Constructor
```typescript
constructor(message: string, got: string)
```
- `message` (`string`): The error message.
- `got` (`string`): The conflicting constant name.

### Properties
- `got` (`string`): The conflicting constant name.

## RGXNotImplementedError
A specific error class for unimplemented functionality. This error is thrown when a feature or method has not been implemented yet. The error code is set to `NOT_IMPLEMENTED` on instantiation.

### Constructor
```typescript
constructor(functionality: string, message?: string | null)
```
- `functionality` (`string`): A description of the functionality that is not yet implemented.
- `message` (`string | null`, optional): An optional additional message providing more context. Defaults to `null`.

### Properties
- `functionality` (`string`): A description of the functionality that is not yet implemented

## RGXNotSupportedError
A specific error class for unsupported functionality. This error is thrown when a feature or method is intentionally not supported (as opposed to simply not yet implemented). The error code is set to `NOT_SUPPORTED` on instantiation.

### Constructor
```typescript
constructor(functionality: string, message?: string | null)
```
- `functionality` (`string`): A description of the functionality that is not supported.
- `message` (`string | null`, optional): An optional additional message providing more context. Defaults to `null`.

### Properties
- `functionality` (`string`): The description of the unsupported functionality.

## RGXInsertionRejectedError
A specific error class for token insertion rejection. This error is thrown when a convertible token's `rgxAcceptInsertion` method returns `false` or a string (rejection reason) during pattern construction via `rgx`, `rgxa`, `rgxw`, `rgxwa`, or `rgxConcat`. The error code is set to `INSERTION_REJECTED` on instantiation.

### Constructor
```typescript
constructor(reason?: string | null, message?: string | null)
```
- `reason` (`string | null`, optional): The reason the insertion was rejected. Defaults to `null`.
- `message` (`string | null`, optional): An optional additional message providing more context. Defaults to `null`.

### Properties
- `reason` (`string | null`): The reason the insertion was rejected, or `null` if no reason was provided.

## RGXOutOfBoundsError
A specific error class for out-of-bounds values. This error is thrown when a numeric value falls outside an expected range. The error code is set to `OUT_OF_BOUNDS` on instantiation.

### Constructor
```typescript
constructor(message: string, got: number, { min, max, inclusiveLeft, inclusiveRight }?: RangeObject)
```
- `message` (`string`): The error message.
- `got` (`number`): The actual numeric value that was received, which fell outside the expected range.
- `min` (`number | null`, optional): The minimum bound of the range. Defaults to `null` (no minimum).
- `max` (`number | null`, optional): The maximum bound of the range. Defaults to `null` (no maximum). Setting `min` to a value greater than `max` will adjust `max` to equal `min`, and vice versa.
- `inclusiveLeft` (`boolean`, optional): Whether the minimum bound is inclusive. Defaults to `true`.
- `inclusiveRight` (`boolean`, optional): Whether the maximum bound is inclusive. Defaults to `true`.

### Properties
- `got` (`number`): The actual numeric value that was received.
- `min` (`number | null`): The minimum bound of the range. Setting this to a value greater than `max` will adjust `max` to equal `min`.
- `max` (`number | null`): The maximum bound of the range. Setting this to a value less than `min` will adjust `min` to equal `max`.
- `inclusiveLeft` (`boolean`): Whether the minimum bound is inclusive.
- `inclusiveRight` (`boolean`): Whether the maximum bound is inclusive.

### Methods
- `failedAtMin() => boolean`: Returns `true` if the `got` value is below the minimum bound (respecting `inclusiveLeft`), otherwise `false`. Returns `false` if `min` is `null`.
- `failedAtMax() => boolean`: Returns `true` if the `got` value is above the maximum bound (respecting `inclusiveRight`), otherwise `false`. Returns `false` if `max` is `null`.
- `failedAtAny() => boolean`: Returns `true` if the value failed at either the minimum or maximum bound.

### Type Guards
#### isInRange
```typescript
function isInRange(value: number, { min, max, inclusiveLeft, inclusiveRight }?: RangeObject): boolean
```
Checks if the given numeric value falls within the specified range.

- `value` (`number`): The value to check.
- `min` (`number | null`, optional): The minimum bound of the range. Defaults to `null` (no minimum).
- `max` (`number | null`, optional): The maximum bound of the range. Defaults to `null` (no maximum).
- `inclusiveLeft` (`boolean`, optional): Whether the minimum bound is inclusive. Defaults to `true`.
- `inclusiveRight` (`boolean`, optional): Whether the maximum bound is inclusive. Defaults to `true`.

**Returns:** `boolean` - `true` if the value is within the specified range, otherwise `false`.

#### assertInRange
```typescript
function assertInRange(value: number, range: RangeObject, message?: string): void
```
Asserts that the given numeric value falls within the specified range. If the assertion fails, an `RGXOutOfBoundsError` will be thrown.

- `value` (`number`): The value to assert.
- `range` (`RangeObject`): The range to check against.
- `message` (`string`, optional): A custom error message. Defaults to `"Value out of bounds"`.

**Returns:** `void` - If the value is within the specified range, the function returns without error. If the value is out of bounds, an `RGXOutOfBoundsError` is thrown with the provided message and range details.

## RGXRegexNotMatchedAtPositionError
A specific error class for regex match failures at a given position. This error is thrown when a regex is expected to match at a specific position in a string but does not (e.g., via `assertRegexMatchesAtPosition`). The error code is set to `REGEX_NOT_MATCHED_AT_POSITION` on instantiation.

### Constructor
```typescript
constructor(message: string, pattern: RegExp, source: string, position: number, contextSize?: number | null)
```
- `message` (`string`): The error message.
- `pattern` (`RegExp`): The regex pattern that failed to match.
- `source` (`string`): The string that was being matched against.
- `position` (`number`): The zero-based index in the source string where the match was expected. Must be >= 0 and < `source.length`, or an `RGXOutOfBoundsError` will be thrown.
- `contextSize` (`number | null`, optional): The number of characters on each side of the position to include in contextual output. Defaults to `null` (full source shown).

### Properties
- `pattern` (`RegExp`): The regex pattern that failed to match.
- `source` (`string`): The string that was being matched against.
- `position` (`number`): The position where the match was expected. Setting this validates that the value is >= 0 and <= `source.length`, throwing `RGXOutOfBoundsError` if not.
- `contextSize` (`number | null`): The number of characters on each side of the position to include in contextual output, or `null` for the full source.

### Methods
- `sourceContext() => string`: Returns the relevant portion of the source string around the position. When `contextSize` is `null` or covers the entire string, returns the full source. Otherwise, returns a substring from `max(0, position - contextSize)` to `min(source.length, position + contextSize)`.
- `hasLeftContext() => boolean`: Returns `true` if the context window starts after the beginning of the source string (i.e., there is truncated content on the left). Returns `false` when `contextSize` is `null`.
- `hasRightContext() => boolean`: Returns `true` if the context window ends before the end of the source string (i.e., there is truncated content on the right). Returns `false` when `contextSize` is `null`.
- `hasFullContext() => boolean`: Returns `true` when the full source is shown (neither side is truncated). This is the case when `contextSize` is `null` or when the context window covers the entire source string.

## RGXRegexNotMatchedAfterPositionError
Structurally identical to `RGXRegexNotMatchedAtPositionError`, but thrown when a regex fails to match anywhere at or after a given position (e.g., via `assertRegexMatchesAfterPosition`) rather than exactly at it. The error code is set to `REGEX_NOT_MATCHED_AFTER_POSITION` on instantiation. All constructor parameters, properties, and methods are the same as `RGXRegexNotMatchedAtPositionError`.

## RGXPartValidationFailedError
A specific error class for RGX part validation failures. This error is thrown when a captured value fails validation in a custom part's `validate` function. The error code is set to `PART_VALIDATION_FAILED` on instantiation.

### Constructor
```typescript
constructor(id: string | null, message: string, gotRaw: string, gotTransformed: unknown)
```
- `id` (`string | null`): The ID of the part that failed validation. If `null`, defaults to `"unknown"`.
- `message` (`string`): The error message.
- `gotRaw` (`string`): The raw captured string value that failed validation.
- `gotTransformed` (`unknown`): The transformed value that was produced by the part's `transform` function, which also failed validation.

### Properties
- `id` (`string`): The ID of the part that failed validation. Defaults to `"unknown"` if `null` was provided.
- `gotRaw` (`string`): The raw captured string value that failed validation.
- `gotTransformed` (`unknown`): The transformed value that was produced by the part's `transform` function, which also failed validation.

## RGXInvalidLexerModeError
A specific error class for invalid lexer mode names. This error is thrown when a mode string is passed to a lexer method but that mode does not exist in the lexer's `lexemeDefinitions` map. The error code is set to `INVALID_LEXER_MODE` on instantiation.

### Constructor
```typescript
constructor(message: string, got: string)
```
- `message` (`string`): The error message.
- `got` (`string`): The mode string that was not found in the lexer's definitions.

### Properties
- `got` (`string`): The mode string that was not found in the lexer's definitions.

## RGXLexemeNotMatchedAtPositionError
A specific error class for lexeme match failures at a given position. This error is thrown when no lexeme definition in the active mode matches the source at the current position (e.g., from `RGXLexer.consume` or `RGXLexer.expectConsume`). The error code is set to `LEXEME_NOT_MATCHED_AT_POSITION` on instantiation.

### Constructor
```typescript
constructor(message: string, source: string, mode: string, position: number, causes?: LexemeNotMatchedCause[], contextSize?: number | null)
```
- `message` (`string`): The error message.
- `source` (`string`): The string that was being lexed.
- `mode` (`string`): The lexer mode that was active when matching was attempted.
- `position` (`number`): The zero-based index in the source string where matching was attempted. Must be >= 0 and <= `source.length`, or an `RGXOutOfBoundsError` will be thrown.
- `causes` (`LexemeNotMatchedCause[]`, optional): An array of per-definition failure causes, each containing the definition `id` and the error thrown when that definition was tried. Defaults to `[]`.
- `contextSize` (`number | null`, optional): The number of characters on each side of the position to include in contextual output. Defaults to `null` (full source shown).

### Properties
- `source` (`string`): The string that was being lexed.
- `mode` (`string`): The lexer mode that was active.
- `position` (`number`): The position where matching was attempted. Setting this validates that the value is >= 0 and <= `source.length`, throwing `RGXOutOfBoundsError` if not.
- `contextSize` (`number | null`): The number of characters on each side of the position to include in contextual output, or `null` for the full source.
- `causes` (`LexemeNotMatchedCause[]`): The list of per-definition failures that occurred before giving up.

### Methods
- `sourceContext() => string`: Returns the relevant portion of the source string around the position. When `contextSize` is `null` or covers the entire string, returns the full source. Otherwise, returns a substring from `max(0, position - contextSize)` to `min(source.length, position + contextSize)`.
- `hasLeftContext() => boolean`: Returns `true` if the context window starts after the beginning of the source string. Returns `false` when `contextSize` is `null`.
- `hasRightContext() => boolean`: Returns `true` if the context window ends before the end of the source string. Returns `false` when `contextSize` is `null`.
- `hasFullContext() => boolean`: Returns `true` when the full source is shown (neither side is truncated).

### Type Guards
#### isLexemeNotMatchedCauseError
```typescript
function isLexemeNotMatchedCauseError(error: unknown): error is LexemeNotMatchedCauseError
```
Checks if the given value is one of the error types that can be recorded as a `LexemeNotMatchedCause` — namely `RGXRegexNotMatchedAtPositionError`, `RGXRegexNotMatchedAfterPositionError`, or `RGXPartValidationFailedError`. These are the errors thrown by individual lexeme definition matching attempts that are caught and collected before a `RGXLexemeNotMatchedAtPositionError` is thrown.

## RGXInvalidLexerError
A specific error class for values that were expected to be an `RGXLexer` instance but were not. This error is thrown by `RGXLexer.assert` when its argument is not an instance of the expected lexer constructor. The error code is set to `INVALID_RGX_LEXER` on instantiation.

### Constructor
```typescript
constructor(message: string, got: unknown, constructorName?: string)
```
- `message` (`string`): The error message.
- `got` (`unknown`): The value that failed the instance check.
- `constructorName` (`string`, optional): The name of the constructor class that was expected. Defaults to `"RGXLexer"`.

### Properties
- `got` (`unknown`): The value that failed the instance check.
- `constructorName` (`string`): The name of the expected constructor class.

## RGXInvalidWalkerError
A specific error class for values that were expected to be an `RGXWalker` instance but were not. This error is thrown by `RGXWalker.assert` when its argument is not an instance of the expected walker constructor. The error code is set to `INVALID_RGX_WALKER` on instantiation.

### Constructor
```typescript
constructor(message: string, got: unknown, constructorName?: string)
```
- `message` (`string`): The error message.
- `got` (`unknown`): The value that failed the instance check.
- `constructorName` (`string`, optional): The name of the constructor class that was expected. Defaults to `"RGXWalker"`.

### Properties
- `got` (`unknown`): The value that failed the instance check.
- `constructorName` (`string`): The name of the expected constructor class.

## RGXInvalidPartError
A specific error class for values that were expected to be an `RGXPart` instance but were not. This error is thrown by `RGXPart.assert` when its argument is not an instance of the expected part constructor. The error code is set to `INVALID_RGX_PART` on instantiation.

### Constructor
```typescript
constructor(message: string, got: unknown, constructorName?: string)
```
- `message` (`string`): The error message.
- `got` (`unknown`): The value that failed the instance check.
- `constructorName` (`string`, optional): The name of the constructor class that was expected. Defaults to `"RGXPart"`.

### Properties
- `got` (`unknown`): The value that failed the instance check.
- `constructorName` (`string`): The name of the expected constructor class.