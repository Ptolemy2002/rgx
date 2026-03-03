# Type Reference
The following is a reference to types relevant to the components listed in this file. The full type reference for the library can be found in [type-reference.md](../type-reference.md).

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

type RGXWalkerOptions<R> = {
    startingSourcePosition?: number;
    reduced?: R;
    infinite?: boolean;
    looping?: boolean;
};

type RGXPartControl = "skip" | "stop" | "silent" | void;

type RGXCapture<T = unknown> = {
    raw: string;
    value: T;
    start: number;
    end: number;
    ownerId: string | null; // The id of the RGXPart that captured this, if any
    branch: number; // The branch index of the token that captured this, or 0 if there is only one branch
    groups: Record<string, string> | null; // The groups captured by the token that captured this, or null if the token didn't capture any groups
};

type RGXPartOptions<R, T=string> = {
    id: string;
    rawTransform: (captured: string) => string;
    transform: (captured: string) => T;
    validate: (captured: RGXCapture<T>, part: RGXPart<R, T>, walker: RGXWalker<R>) => boolean | string;
    beforeCapture: ((part: RGXPart<R, T>, walker: RGXWalker<R>) => RGXPartControl) | null;
    afterCapture: ((capture: RGXCapture<T>, part: RGXPart<R, T>, walker: RGXWalker<R>) => void) | null;
};

type RGXWOptions<R = unknown> = RGXWalkerOptions<R> & {
    multiline?: boolean;
};
```

# Constructor Utilities
The following are utilities for creating `RGXWalker` instances without the need to use the `new` keyword, which can be more ergonomic in many cases.

## rgxw
```typescript
function rgxw<R = unknown>(source: string, {multiline=true, ...options}: RGXWOptions<R> = {}): (strings: TemplateStringsArray, ...tokens: RGXToken[]
) => RGXWalker<R>
```
Creates an `RGXWalker` instance from an interpolation of strings and tokens. The token array is processed exactly like in `rgx`, but instead of returning an `ExtRegExp`, it returns an `RGXWalker` that can be used to walk through matches of the regex pattern in the source string.

### Parameters
  - `source` (`string`): An arbitrary string value that will be included in the `source` property of the walker object.
  - `options` (`RGXWOptions<R>`, optional): Additional options for configuring the behavior of the resulting `RGXWalker`. This includes:
    - `startingSourcePosition` (`number`, optional): An optional initial value for the walker's `sourcePosition` property, which tracks the current position in the source string during walking. Defaults to `0`.
    - `multiline` (`boolean`, optional): Whether to strip newlines and trim leading whitespace from the literal string parts of the template. Defaults to `true`. When `true`, each literal string part is split by newlines, each line has its leading whitespace trimmed, empty lines are removed, comments (denoted with `//`) ending a line or on a line by themselves are stripped, and the remaining lines are joined together. Interpolated tokens (including string tokens via `${"..."}`) are not affected. When `false`, literal string parts are preserved exactly as written.
    - `reduced` (`R`, optional): An optional initial value for the walker's `reduced` property, which can be used to accumulate results across matches.

### Returns
- `(strings: TemplateStringsArray, ...tokens: RGXToken[]) => RGXWalker<R>`: A template tag function that takes a template literal and returns an `RGXWalker` instance configured with the provided source, the provided tokens, and the specified options.

## rgxwa
```typescript
function rgxwa<R = unknown>(source: string, tokens: RGXToken[], options: Omit<RGXWOptions<R>, "multiline"> = {}): RGXWalker<R>
```
As an alternative to using the `rgxw` template tag, you can directly call `rgxwa` with a source string, an array of RGX tokens, and options to get an `RGXWalker` instance. This is useful in cases where you don't want to use a template literal. The token array is processed exactly like in `rgxa`, and the provided options are passed through to configure the resulting walker.

#### Parameters
  - `source` (`string`): An arbitrary string value that will be included in the `source` property of the walker object.
  - `tokens` (`RGXToken[]`): The RGX tokens to be resolved and concatenated to form the regex pattern for the walker.
  - `options` (`Omit<RGXWOptions<R>, "multiline">`, optional): Additional options for configuring the behavior of the resulting `RGXWalker`, excluding the `multiline` option which is not applicable when not using a template literal. This includes:
    - `startingSourcePosition` (`number`, optional): An optional initial value for the walker's `sourcePosition` property, which tracks the current position in the source string during walking. Defaults to `0`.
    - `reduced` (`R`, optional): An optional initial value for the walker's `reduced` property, which can be used to accumulate results across matches.

#### Returns
- `RGXWalker<R>`: An `RGXWalker` instance configured with the provided source, the resolved tokens, and the specified options.

# RGXPart\<R, T=string\>
A class that wraps an `RGXToken` with optional callbacks for use within an `RGXWalker`. It implements `RGXConvertibleToken`, delegating `rgxIsGroup` and `rgxIsRepeatable` to the wrapped token. Unlike plain tokens, Parts can control walker behavior via `beforeCapture` (returning an `RGXPartControl` value) and react to captures via `afterCapture`. Parts are purely definitions and do not store capture state — all captures are stored on the walker as `RGXCapture` objects.

A function `rgxPart` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

## Static Properties
- `check(value: unknown): value is RGXPart`: A type guard that checks if the given value is an instance of `RGXPart`.
- `assert(value: unknown): asserts value is RGXPart`: An assertion that checks if the given value is an instance of `RGXPart`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

## Constructor
```typescript
constructor(token: RGXToken, options?: Partial<RGXPartOptions<R, T>>)
```
- `token` (`RGXToken`): The token to wrap.
- `options` (`Partial<RGXPartOptions<R, T>>`, optional): Configuration options. Defaults to `{}`.
  - `id` (`string`, optional): An optional identifier for this part. Defaults to `null`, but must be a string if provided.
  - `rawTransform` (`(captured: string) => string`, optional): A function that transforms the raw captured string before it is stored as `raw` on the capture result and before `transform` is applied. Defaults to an identity function.
  - `transform` (`(captured: string) => T`, optional): A function that transforms the captured string into the desired type `T`. Defaults to an identity function that casts the string to `T`.
  - `beforeCapture` (`((part: RGXPart<R, T>, walker: RGXWalker<R>) => RGXPartControl) | null`, optional): A callback invoked before capturing this part during walking. Returns an `RGXPartControl` value to control walker behavior: `"skip"` to skip this token without capturing, `"silent"` to capture but not record in `captures`, `"stop"` to halt immediately without capturing or advancing, or `void`/`undefined` to proceed normally. Defaults to `null`.
  - `afterCapture` (`((capture: RGXCapture<T>, part: RGXPart<R, T>, walker: RGXWalker<R>) => void) | null`, optional): A callback invoked after capturing this part during walking. Receives the typed `RGXCapture<T>` result. Can call `walker.stop()` to halt walking after this capture. Defaults to `null`.
  - `validate` (`((capture: RGXCapture<T>, walker: RGXWalker<R>) => boolean | string) | null`, optional): A callback invoked during validation after capturing and transforming, but before `afterCapture`. Returns `true` if validation passes, `false` to fail with a generic error, or a string to fail with that string as the error message. Defaults to `null`.

## Properties
- `id` (`string | null`): An optional identifier for this part.
- `token` (`RGXToken`): The wrapped token.
- `rawTransform` (`(captured: string) => string`, readonly): The raw transform function applied to the matched string before it is stored as `raw` and before `transform` is called.
- `transform` (`(captured: string) => T`, readonly): The transform function used to convert captured strings to values of type `T`.
- `beforeCapture` (`((part: RGXPart<R, T>, walker: RGXWalker<R>) => RGXPartControl) | null`, readonly): The before-capture callback, or `null`.
- `afterCapture` (`((capture: RGXCapture<T>, part: RGXPart<R, T>, walker: RGXWalker<R>) => void) | null`, readonly): The after-capture callback, or `null`.
- `rgxIsGroup` (`boolean`): Delegates to the wrapped token's group status via `isRGXGroupedToken`.
- `rgxIsRepeatable` (`boolean`): If the wrapped token is an `RGXConvertibleToken`, delegates to its `rgxIsRepeatable` property (defaulting to `true` if not present). Otherwise, returns `true`.

## Methods
- `toRgx() => RGXToken`: Returns the wrapped token.
- `clone(depth: CloneDepth = "max") => RGXPart`: Creates a clone of this part. When `depth` is `0`, returns `this`; otherwise, returns a new `RGXPart` with a cloned token and the same `rawTransform`, `transform`, `beforeCapture`, and `afterCapture` references.
- `hasId() => this is RGXPart<R, T> & { id: string }`: A type guard that checks if this part has a non-null `id`. If `true`, narrows the type to indicate that `id` is a string.
- `validate(capture: RGXCapture<T>, walker: RGXWalker<R>) => void`: A method that calls the inner passed validation logic for this part, if any. If it returns `false`, a generic `RGXPartValidationFailedError` is thrown. If it returns a string, an `RGXPartValidationFailedError` is thrown with that string as the message. If it returns `true`, validation passed. This is called internally by the walker after capturing and transforming a part, before invoking `afterCapture`.

# RGXWalker\<R\>
A class that walks through a sequence of RGX tokens, matching each token against a source string at the current position. It implements `RGXConvertibleToken`, delegating to its internal `RGXTokenCollection`. The walker maintains a source position and a token position, advancing through both as tokens are matched. When an `RGXPart` is encountered, its `beforeCapture` callback can control behavior via return values (`RGXPartControl`), and its `afterCapture` callback is invoked with the typed capture result. All captures are stored as structured `RGXCapture` objects on the walker, and captures with ids are stored in the `namedCaptures` property also. The generic type `R` represents a user-defined "reduced" value that can accumulate state during walking (e.g., via `RGXPart` callbacks).

A function `rgxWalker` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

## Static Properties
- `check(value: unknown): value is RGXWalker`: A type guard that checks if the given value is an instance of `RGXWalker`.
- `assert(value: unknown): asserts value is RGXWalker`: An assertion that checks if the given value is an instance of `RGXWalker`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

## Constructor
```typescript
constructor(source: string, tokens: RGXTokenCollectionInput, options?: RGXWalkerOptions<R>)
```
- `source` (`string`): The string to walk through, matching tokens against.
- `tokens` (`RGXTokenCollectionInput`): The tokens to match sequentially. Internally stored as an `RGXTokenCollection` in 'concat' mode.
- `options` (`RGXWalkerOptions<R>`, optional): Configuration options. Defaults to `{}`.
  - `startingSourcePosition` (`number`, optional): The starting index in the source string. Defaults to `0`.
  - `reduced` (`R`, optional): The initial value for the `reduced` accumulator. Defaults to `null`.
  - `infinite` (`boolean`, optional): When `true`, the walker stays at the last token indefinitely rather than stopping when the token collection is exhausted, continuing to match the last token until the source is consumed. Defaults to `false`.
  - `looping` (`boolean`, optional): When `true`, the walker loops back to token position `0` when the token collection is exhausted, continuing to match from the start until the source is consumed. Defaults to `false`.

## Properties
- `source` (`string`): The source string being walked (readonly).
- `sourcePosition` (`number`): The current index in the source string. Range is `[0, source.length]` inclusive, where `source.length` represents "fully consumed". Setting this validates that the value is >= 0 and <= `source.length`, throwing `RGXOutOfBoundsError` if not.
- `tokens` (`RGXTokenCollection`): The internal collection of tokens in 'concat' mode (readonly).
- `tokenPosition` (`number`): The current index in the token collection. Setting this validates that the value is >= 0 and <= `tokens.length`, throwing `RGXOutOfBoundsError` if not.
- `reduced` (`R`): A user-defined accumulator value, typically updated by `RGXPart` callbacks during walking.
- `captures` (`RGXCapture[]`): An array of structured capture results recorded during walking. Each entry has a `raw` string (the `rawTransform` result for Parts, or the matched string for plain tokens), a `value` (the `transform` result for Parts, or the matched string for plain tokens), `start` and `end` indices in the source string, an `ownerId` that is the `id` of the Part that produced it (or `null` for captures from plain tokens or parts without ids), and a `branch` index indicating which alternative of a multi-branch Part token was matched (or `0` if there is only one branch or the token is not a Part).
- `namedCaptures` (`Record<string, RGXCapture[]>`): An object mapping capture IDs to their corresponding `RGXCapture` results. Only Parts with non-null IDs are included. The captures occur in the same order as they appear in the `captures` array.
- `infinite` (`boolean`): Whether the walker is in infinite mode — stays at the last token when the token collection is exhausted until the source is consumed.
- `looping` (`boolean`): Whether the walker is in looping mode — loops back to token position `0` when the token collection is exhausted until the source is consumed.
- `stopped` (`boolean`, readonly): Whether the walker has been stopped, either by a Part's `beforeCapture` returning `"stop"` or by calling `stop()` in an `afterCapture` callback.

## Methods
- `stop() => this`: Sets `stopped` to `true`, causing any active `stepToToken`, `stepToPart`, or `walk` loop to halt after the current iteration. Typically called from an `afterCapture` callback to stop walking after the current capture.
- `atTokenEnd() => boolean`: Returns `true` if the token position is at or past the end of the token collection.
- `hasNextToken(predicate?: (token: RGXToken) => boolean) => boolean`: Returns `true` if there is a current token and it satisfies the optional predicate (defaults to `() => true`).
- `atSourceEnd() => boolean`: Returns `true` if the source has been fully consumed (`sourcePosition >= source.length`).
- `hasNextSource(predicate?: (rest: string) => boolean) => boolean`: Returns `true` if the source is not fully consumed and the remaining source satisfies the optional predicate (defaults to `() => true`).
- `lastCapture() => RGXCapture | null`: Returns the last entry in `captures`, or `null` if empty.
- `currentToken() => RGXToken | null`: Returns the token at the current token position, or `null` if at the end.
- `remainingSource() => string | null`: Returns the remaining source string from the current position onward, or `null` if the source is fully consumed.
- `capture(token: RGXToken, includeMatch?: false) => string`: Resolves the token to a regex, asserts that it matches at the current source position (throwing `RGXRegexNotMatchedAtPositionError` if not), and advances the source position by the match length. Returns the matched string.
- `capture(token: RGXToken, includeMatch: true) => RegExpExecArray`: Same as above, but returns the full `RegExpExecArray` from the match instead of just the matched string.
- `step() => RGXCapture | null`: Steps through the next token in the collection. If the token is an `RGXPart`, calls `beforeCapture` first — if it returns `"stop"`, sets `stopped` and returns `null` without advancing; if `"skip"`, advances the token position and returns `null` without capturing; if `"silent"`, captures but does not add to `captures` or `namedCaptures`. After capturing, validates. After validating, calls `afterCapture` if present. Returns the `RGXCapture` result, or `null` if there are no more tokens (or no more source in `infinite`/`looping` mode), the step was skipped, or the walker was stopped.
- `stepToToken(predicate: (token: RGXToken) => boolean) => this`: Steps through tokens until the predicate returns `true` for the current token or the walker is stopped. The matching token is not consumed.
- `stepToPart(predicate?: (part: RGXPart<R>) => boolean) => this`: Steps through tokens until the next `RGXPart` satisfying the predicate is reached. If already at a Part, steps once first to move past it. The matching Part is not consumed.
- `walk() => this`: Steps through all remaining tokens until the end of the token collection (or until the source is consumed in `infinite`/`looping` mode) or the walker is stopped.
- `toRgx() => RGXToken`: Returns the internal `RGXTokenCollection`, allowing the walker to be used as a convertible token.
- `clone(depth: CloneDepth = "max") => RGXWalker`: Creates a clone of the walker. When `depth` is `0`, returns `this`; otherwise, creates a new `RGXWalker` with cloned tokens, source position, reduced value, captures, stopped state, and the `infinite`/`looping` flags.