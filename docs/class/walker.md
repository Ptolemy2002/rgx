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
    readonly rgxIsRepeatable?: boolean,
    readonly rgxInterpolate?: boolean
};
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXToken[];
type RGXTokenOrPart<R, S = unknown, T = unknown> = RGXToken | RGXPart<R, S, T>;

type RGXWalkerOptions<R, S = unknown> = {
    startingSourcePosition?: number;
    reduced?: R;
    share?: S;
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

type RGXPartContext<R, S = unknown, T = string> = {
    part: RGXPart<R, S, T>;
    walker: RGXWalker<R, S>;
};

type RGXPartOptions<R, S = unknown, T=string> = {
    id: string;
    rawTransform: (captured: string) => string;
    transform: (captured: string) => T;
    validate: (captured: RGXCapture<T>, context: RGXPartContext<R, S, T>) => boolean | string;
    beforeCapture: ((context: RGXPartContext<R, S, T>) => RGXPartControl) | null;
    afterCapture: ((capture: RGXCapture<T>, context: RGXPartContext<R, S, T>) => void) | null;
    afterFailure: ((e: RGXRegexNotMatchedAtPositionError, context: RGXPartContext<R, S, T>) => RGXPartControl) | null;
    afterValidationFailure: ((e: RGXPartValidationFailedError, context: RGXPartContext<R, S, T>) => RGXPartControl) | null;
};

type RGXOptions = {
    multiline?: boolean;
    verbatim?: boolean;
};

type RGXWOptions<R = unknown, S = unknown> = RGXWalkerOptions<R, S> & RGXOptions;
```

# Constructor Utilities
The following are utilities for creating `RGXWalker` instances without the need to use the `new` keyword, which can be more ergonomic in many cases.

## rgxw
```typescript
function rgxw<R = unknown, S = unknown, T = unknown>(source: string, {multiline=true, verbatim=true, ...options}: RGXWOptions<R, S> = {}): (strings: TemplateStringsArray, ...tokens: RGXTokenOrPart<R, S, T>[]) => RGXWalker<R, S>
```
Creates an `RGXWalker` instance from an interpolation of strings and tokens. Plain tokens are processed exactly like in `rgx`; `RGXPart` instances are tested for their inner token to accept insertion, then passed through. Instead of returning an `ExtRegExp`, it returns an `RGXWalker` that can be used to walk through matches of the regex pattern in the source string.

### Parameters
  - `source` (`string`): An arbitrary string value that will be included in the `source` property of the walker object.
  - `options` (`RGXWOptions<R, S>`, optional): Additional options for configuring the behavior of the resulting `RGXWalker`. This includes:
    - `startingSourcePosition` (`number`, optional): An optional initial value for the walker's `sourcePosition` property, which tracks the current position in the source string during walking. Defaults to `0`.
    - `multiline` (`boolean`, optional): Whether to strip newlines and trim leading whitespace from the literal string parts of the template. Defaults to `true`. When `true`, each literal string part is split by newlines, each line has its leading whitespace trimmed, empty lines are removed, comments (denoted with `//`) ending a line or on a line by themselves are stripped, and the remaining lines are joined together. Interpolated tokens (including string tokens via `${"..."}`) are not affected. When `false`, literal string parts are preserved exactly as written.
    - `verbatim` (`boolean`, optional): Whether to treat literal string parts of the template as verbatim text. Defaults to `true`. When `true`, literal string parts are escaped so that special regex characters are matched literally. When `false`, literal string parts are inserted as raw regex syntax without escaping. Interpolated values (including string tokens via `${"..."}`) are always escaped regardless of this setting.
    - `reduced` (`R`, optional): An optional initial value for the walker's `reduced` property, which can be used to accumulate results across matches.
    - `share` (`S`, optional): An optional initial value for the walker's `share` property, which is passed to all Part callbacks and can be used as shared mutable state across parts without being accumulated in `reduced`.

### Returns
- `(strings: TemplateStringsArray, ...tokens: RGXTokenOrPart<R, S, T>[]) => RGXWalker<R, S>`: A template tag function that takes a template literal and returns an `RGXWalker` instance configured with the provided source, the provided tokens, and the specified options.

## rgxwa
```typescript
function rgxwa<R = unknown, S = unknown, T = unknown>(source: string, tokens: RGXTokenOrPart<R, S, T>[], options: Omit<RGXWOptions<R, S>, "multiline"> = {}): RGXWalker<R, S>
```
As an alternative to using the `rgxw` template tag, you can directly call `rgxwa` with a source string, an array of tokens and/or parts, and options to get an `RGXWalker` instance. This is useful in cases where you don't want to use a template literal. Plain tokens are validated exactly like in `rgxa`; `RGXPart` instances are tested for their inner token to accept insertion and passed through to the walker. The provided options are passed through to configure the resulting walker.

#### Parameters
  - `source` (`string`): An arbitrary string value that will be included in the `source` property of the walker object.
  - `tokens` (`RGXTokenOrPart<R, S, T>[]`): The tokens and/or parts to form the walker's token sequence. Plain `RGXToken` values are validated; `RGXPart` instances are passed through as-is.
  - `options` (`Omit<RGXWOptions<R, S>, "multiline">`, optional): Additional options for configuring the behavior of the resulting `RGXWalker`, excluding the `multiline` option which is not applicable when not using a template literal. This includes:
    - `startingSourcePosition` (`number`, optional): An optional initial value for the walker's `sourcePosition` property, which tracks the current position in the source string during walking. Defaults to `0`.
    - `reduced` (`R`, optional): An optional initial value for the walker's `reduced` property, which can be used to accumulate results across matches.
    - `share` (`S`, optional): An optional initial value for the walker's `share` property, which is passed to all Part callbacks and can be used as shared mutable state across parts.

#### Returns
- `RGXWalker<R, S>`: An `RGXWalker` instance configured with the provided source, the resolved tokens, and the specified options.

# RGXPart\<R, S=unknown, T=string\>
A class that wraps an `RGXToken` with optional callbacks for use within an `RGXWalker`. Unlike plain tokens, Parts can control walker behavior via `beforeCapture` (returning an `RGXPartControl` value) and react to captures via `afterCapture`. Parts are purely definitions and do not store capture state — all captures are stored on the walker as `RGXCapture` objects.

A function `rgxPart` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

## Static Properties
- `check(value: unknown): value is RGXPart`: A type guard that checks if the given value is an instance of `RGXPart`.
- `assert(value: unknown): asserts value is RGXPart`: An assertion that checks if the given value is an instance of `RGXPart`. If the assertion fails, an `RGXInvalidPartError` will be thrown.

## Constructor
```typescript
constructor(token: RGXToken, options?: Partial<RGXPartOptions<R, S, T>>)
```
- `token` (`RGXToken`): The token to wrap.
- `options` (`Partial<RGXPartOptions<R, S, T>>`, optional): Configuration options. Defaults to `{}`.
  - `id` (`string`, optional): An optional identifier for this part. Defaults to `null`, but must be a string if provided.
  - `rawTransform` (`(captured: string) => string`, optional): A function that transforms the raw captured string before it is stored as `raw` on the capture result and before `transform` is applied. Defaults to an identity function.
  - `transform` (`(captured: string) => T`, optional): A function that transforms the captured string into the desired type `T`. Defaults to an identity function that casts the string to `T`.
  - `beforeCapture` (`((context: RGXPartContext<R, S, T>) => RGXPartControl) | null`, optional): A callback invoked before capturing this part during walking. Receives an `RGXPartContext` object containing `part` (this part) and `walker` (the active walker). Returns an `RGXPartControl` value to control walker behavior: `"skip"` to skip this token without capturing, `"silent"` to capture but not record in `captures`, `"stop"` to halt immediately without capturing or advancing, or `void`/`undefined` to proceed normally. Defaults to `null`.
  - `afterCapture` (`((capture: RGXCapture<T>, context: RGXPartContext<R, S, T>) => void) | null`, optional): A callback invoked after capturing this part during walking. Receives the typed `RGXCapture<T>` result and an `RGXPartContext` object containing `part` and `walker`. Can call `walker.stop()` to halt walking after this capture. Defaults to `null`.
  - `afterFailure` (`((e: RGXRegexNotMatchedAtPositionError, context: RGXPartContext<R, S, T>) => RGXPartControl) | null`, optional): A callback invoked when the regex match for this part fails (i.e., `RGXRegexNotMatchedAtPositionError` is thrown). Receives the error and an `RGXPartContext` object containing `part` and `walker`. Returns an `RGXPartControl` value to control walker behavior: `"stop"` to set `stopped` and return `null` without re-throwing the error; `"skip"` to advance the token position and return `null` without re-throwing the error; or `void`/`undefined` (and `"silent"`, which has no distinct effect here) to re-throw the error normally. Defaults to `null`.
  - `afterValidationFailure` (`((e: RGXPartValidationFailedError, context: RGXPartContext<R, S, T>) => RGXPartControl) | null`, optional): A callback invoked when validation fails for this part (i.e., `RGXPartValidationFailedError` is thrown). Receives the error and an `RGXPartContext` object containing `part` and `walker`. Returns an `RGXPartControl` value to control walker behavior: `"stop"` to set `stopped` and return `null` without re-throwing the error; `"skip"` to advance the token position and return `null` without re-throwing the error; or `void`/`undefined` (and `"silent"`, which has no distinct effect here) to re-throw the error normally. Defaults to `null`.
  - `validate` (`((capture: RGXCapture<T>, context: RGXPartContext<R, S, T>) => boolean | string) | null`, optional): A callback invoked during validation after capturing and transforming, but before `afterCapture`. Receives the capture result and an `RGXPartContext` object containing `part` and `walker`. Returns `true` if validation passes, `false` to fail with a generic error, or a string to fail with that string as the error message. Defaults to `null`.

## Properties
- `id` (`string | null`): An optional identifier for this part.
- `token` (`RGXToken`): The wrapped token.
- `rawTransform` (`(captured: string) => string`, readonly): The raw transform function applied to the matched string before it is stored as `raw` and before `transform` is called.
- `transform` (`(captured: string) => T`, readonly): The transform function used to convert captured strings to values of type `T`.
- `beforeCapture` (`((context: RGXPartContext<R, S, T>) => RGXPartControl) | null`, readonly): The before-capture callback, or `null`.
- `afterCapture` (`((capture: RGXCapture<T>, context: RGXPartContext<R, S, T>) => void) | null`, readonly): The after-capture callback, or `null`.
- `afterFailure` (`((e: RGXRegexNotMatchedAtPositionError, context: RGXPartContext<R, S, T>) => RGXPartControl) | null`, readonly): The after-failure callback, or `null`.
- `afterValidationFailure` (`((e: RGXPartValidationFailedError, context: RGXPartContext<R, S, T>) => RGXPartControl) | null`, readonly): The after-validation-failure callback, or `null`.

## Methods
- `clone(depth: CloneDepth = "max") => RGXPart`: Creates a clone of this part. When `depth` is `0`, returns `this`; otherwise, returns a new `RGXPart` with a cloned token and the same `rawTransform`, `transform`, `beforeCapture`, `afterCapture`, `afterFailure`, and `afterValidationFailure` references.
- `hasId() => this is RGXPart<R, S, T> & { id: string }`: A type guard that checks if this part has a non-null `id`. If `true`, narrows the type to indicate that `id` is a string.
- `validate(capture: RGXCapture<T>, context: RGXPartContext<R, S, T>) => void`: A method that calls the inner passed validation logic for this part, if any. If it returns `false`, a generic `RGXPartValidationFailedError` is thrown. If it returns a string, an `RGXPartValidationFailedError` is thrown with that string as the message. If it returns `true`, validation passed. This is called internally by the walker after capturing and transforming a part, before invoking `afterCapture`.

# RGXWalker\<R, S=unknown\>
A class that walks through a sequence of RGX tokens (and/or `RGXPart` instances), matching each against a source string at the current position. The walker maintains a source position and a token position, advancing through both as tokens are matched. When an `RGXPart` is encountered, its `beforeCapture` callback can control behavior via return values (`RGXPartControl`), and its `afterCapture` callback is invoked with the typed capture result. All captures are stored as structured `RGXCapture` objects on the walker, and captures with ids are stored in the `namedCaptures` property also. The generic type `R` represents a user-defined "reduced" value that accumulates the ultimate result of the walk (e.g., built up via `RGXPart` callbacks and returned by `walk()`). The generic type `S` represents a user-defined "shared" value that works almost exactly like `reduced` — it is mutable state that parts can read and write via `context.walker.share` — but it is not considered the ultimate result of the walker. This means parts can freely contribute to `share` without those contributions needing to conform to type `R`, making `share` suitable for intermediate bookkeeping state while `reduced` carries the final result.

A function `rgxWalker` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

## Static Properties
- `check(value: unknown): value is RGXWalker`: A type guard that checks if the given value is an instance of `RGXWalker`.
- `assert(value: unknown): asserts value is RGXWalker`: An assertion that checks if the given value is an instance of `RGXWalker`. If the assertion fails, an `RGXInvalidWalkerError` will be thrown.

## Constructor
```typescript
constructor(source: string, tokens: RGXTokenOrPart<R, S>[], options?: RGXWalkerOptions<R, S>)
```
- `source` (`string`): The string to walk through, matching tokens against.
- `tokens` (`RGXTokenOrPart<R, S>[]`): The tokens (and/or `RGXPart` instances) to match sequentially. Plain `RGXToken` values and `RGXPart` instances can be mixed freely.
- `options` (`RGXWalkerOptions<R, S>`, optional): Configuration options. Defaults to `{}`.
  - `startingSourcePosition` (`number`, optional): The starting index in the source string. Defaults to `0`.
  - `reduced` (`R`, optional): The initial value for the `reduced` accumulator. Defaults to `null`.
  - `share` (`S`, optional): The initial value for the `share` property, passed to all Part callbacks. Defaults to `null`.
  - `infinite` (`boolean`, optional): When `true`, the walker stays at the last token indefinitely rather than stopping when the token collection is exhausted, continuing to match the last token until the source is consumed. Defaults to `false`.
  - `looping` (`boolean`, optional): When `true`, the walker loops back to token position `0` when the token collection is exhausted, continuing to match from the start until the source is consumed. Defaults to `false`.

## Properties
- `source` (`string`): The source string being walked (readonly).
- `sourcePosition` (`number`): The current index in the source string. Range is `[0, source.length]` inclusive, where `source.length` represents "fully consumed". Setting this validates that the value is >= 0 and <= `source.length`, throwing `RGXOutOfBoundsError` if not. Non-integer values are floored before being stored.
- `tokens` (`RGXTokenOrPart<R, S>[]`): The array of tokens and/or parts to match against (readonly).
- `tokenPosition` (`number`): The current index in the token collection. Setting this validates that the value is >= 0 and <= `tokens.length`, throwing `RGXOutOfBoundsError` if not. Non-integer values are floored before being stored.
- `reduced` (`R`): The ultimate result value of the walk. Typically built up by `RGXPart` callbacks during walking and returned directly by `walk()`. All contributions to `reduced` must conform to type `R`.
- `share` (`S`): A shared mutable value that works almost exactly like `reduced` — parts can read and write it freely via `context.walker.share` — but it is not considered the ultimate result of the walker. This means parts can contribute to `share` without those contributions needing to adhere to type `R`, making `share` well-suited for intermediate bookkeeping, cross-part coordination, or any accumulated state that is not itself the final answer.
- `captures` (`RGXCapture[]`): An array of structured capture results recorded during walking. Each entry has a `raw` string (the `rawTransform` result for Parts, or the matched string for plain tokens), a `value` (the `transform` result for Parts, or the matched string for plain tokens), `start` and `end` indices in the source string, an `ownerId` that is the `id` of the Part that produced it (or `null` for captures from plain tokens or parts without ids), and a `branch` index indicating which alternative of a multi-branch Part token was matched (or `0` if there is only one branch or the token is not a Part).
- `namedCaptures` (`Record<string, RGXCapture[]>`): An object mapping capture IDs to their corresponding `RGXCapture` results. Only Parts with non-null IDs are included. The captures occur in the same order as they appear in the `captures` array.
- `infinite` (`boolean`): Whether the walker is in infinite mode — stays at the last token when the token collection is exhausted until the source is consumed.
- `looping` (`boolean`): Whether the walker is in looping mode — loops back to token position `0` when the token collection is exhausted until the source is consumed.
- `stopped` (`boolean`, readonly): Whether the walker has been stopped, either by a Part's `beforeCapture`, `afterFailure`, or `afterValidationFailure` returning `"stop"`, or by calling `stop()` in an `afterCapture` callback.

## Methods
- `stop() => this`: Sets `stopped` to `true`, causing any active `stepToToken`, `stepToPart`, or `walk` loop to halt after the current iteration. Typically called from an `afterCapture` callback to stop walking after the current capture.
- `atTokenEnd() => boolean`: Returns `true` if the token position is at or past the end of the token collection.
- `hasNextToken(predicate?: (token: RGXTokenOrPart<R, S, unknown>) => boolean) => boolean`: Returns `true` if there is a current token and it satisfies the optional predicate (defaults to `() => true`).
- `atSourceEnd() => boolean`: Returns `true` if the source has been fully consumed (`sourcePosition >= source.length`).
- `hasNextSource(predicate?: (rest: string) => boolean) => boolean`: Returns `true` if the source is not fully consumed and the remaining source satisfies the optional predicate (defaults to `() => true`).
- `lastCapture() => RGXCapture | null`: Returns the last entry in `captures`, or `null` if empty.
- `currentToken() => RGXTokenOrPart<R, S> | null`: Returns the token or part at the current token position, or `null` if at the end.
- `remainingSource() => string | null`: Returns the remaining source string from the current position onward, or `null` if the source is fully consumed.
- `capture(token: RGXTokenOrPart<R, S>, includeMatch?: false) => string`: Resolves the token (or part's inner token) to a regex, asserts that it matches at the current source position (throwing `RGXRegexNotMatchedAtPositionError` if not), and advances the source position by the match length. Returns the matched string.
- `capture(token: RGXTokenOrPart<R, S>, includeMatch: true) => RegExpExecArray`: Same as above, but returns the full `RegExpExecArray` from the match instead of just the matched string.
- `step() => RGXCapture | null`: Steps through the next token in the collection. If the token is an `RGXPart`, calls `beforeCapture` first, passing an `RGXPartContext` containing the part and walker — if it returns `"stop"`, sets `stopped` and returns `null` without advancing; if `"skip"`, advances the token position and returns `null` without capturing; if `"silent"`, captures but does not add to `captures` or `namedCaptures`. After capturing, validates by passing the capture and context. If validation fails, `afterValidationFailure` is called with the error and context — if it returns `"stop"`, sets `stopped` and returns `null` without re-throwing; if `"skip"`, advances the token position and returns `null` without re-throwing; otherwise the error is re-thrown. If the match itself fails, `afterFailure` is called with the error and context — if it returns `"stop"`, sets `stopped` and returns `null` without re-throwing; if `"skip"`, advances the token position and returns `null` without re-throwing; otherwise the error is re-thrown. After validating, calls `afterCapture` with the capture and context if present. Returns the `RGXCapture` result, or `null` if there are no more tokens (or no more source in `infinite`/`looping` mode), the step was skipped, or the walker was stopped.
- `stepToToken(predicate: (token: RGXTokenOrPart<R, S>) => boolean) => this`: Steps through tokens until the predicate returns `true` for the current token or the walker is stopped. The matching token is not consumed.
- `stepToPart(predicate?: (part: RGXPart<R, S, unknown>) => boolean) => this`: Steps through tokens until the next `RGXPart` satisfying the predicate is reached. If already at a Part, steps once first to move past it. The matching Part is not consumed.
- `walk() => R`: Steps through all remaining tokens until the end of the token collection (or until the source is consumed in `infinite`/`looping` mode) or the walker is stopped. Returns the walker's `reduced` value after walking completes.
- `clone(depth: CloneDepth = "max") => RGXWalker`: Creates a clone of the walker. When `depth` is `0`, returns `this`; otherwise, creates a new `RGXWalker` with cloned tokens, source position, reduced value, share value, captures, stopped state, and the `infinite`/`looping` flags.
