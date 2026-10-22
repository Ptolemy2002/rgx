# Type Reference
The following is a reference to types relevant to the components listed in this file. The full type reference for the library can be found in [type-reference.md](../type-reference.md).

```typescript
import { Branded } from "@ptolemy2002/ts-brand-utils";
import { CloneDepth } from "@ptolemy2002/immutability-utils";
// type CloneDepth = number | "max";

type RGXNoOpToken = null | undefined;
type RGXLiteralToken = RegExp;
type RGXNativeToken = string | number | boolean | RGXNoOpToken;
type RGXInsertionContext = {
    readonly flags: ValidRegexFlags;              // effective at this position, including enclosing modifier groups
    readonly siblings: readonly RGXToken[];       // the tokens at the same level, including this one
    readonly index: number;                       // this token's position in siblings
    readonly parent: RGXInsertionContext | null;  // the enclosing level, or null at the top level
    readonly container: RGXToken | null;          // the token whose contents this level is, or null at the top level
};
type RGXConvertibleToken = {
    toRgx: (currentFlags?: string) => RGXToken,   // currentFlags: the flags in effect where the token is placed
    rgxAcceptInsertion?: (context: RGXInsertionContext) => string | boolean,
    readonly rgxIsRepeatable?: boolean
};
type RGXInterpolationToken = { readonly rgxInterpolation: string };
type RGXJSONPrimitive = string | number | boolean | null;
type RGXJSONObject = { [key: string]: RGXJSONValue | undefined };
type RGXJSONValue = RGXJSONPrimitive | RGXJSONValue[] | RGXJSONObject;
type RGXJSONNativeToken = Exclude<RGXNativeToken, undefined>;
type RGXJSONLiteralToken = { $rgx: true, source: string, flags?: string };
type RGXJSONClassToken = { $rgx: true, class: string, args?: RGXJSONValue[] };
type RGXJSONInterpolationToken = { $rgx: true, interpolation: string };
type RGXJSONObjectToken = RGXJSONLiteralToken | RGXJSONClassToken | RGXJSONInterpolationToken;
type RGXJSONToken = RGXJSONNativeToken | RGXJSONObjectToken | RGXJSONToken[];
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXInterpolationToken | RGXJSONObjectToken | RGXToken[];
type RGXTokenOrPart<R, S = unknown, T = any> = RGXToken | RGXPart<R, S, T>;
// A union of tokens and parts can be written as an array nested to any depth.
type RGXWalkerStep<R, S = unknown, T = any> = RGXTokenOrPart<R, S, T> | RGXWalkerStep<R, S, T>[];
type RGXWalkerStepDirective = "stop" | "skip" | "silent";

type RGXWalkerOptions<R, S = unknown> = {
    startingSourcePosition?: number;
    reduced?: R;
    share?: S;
    infinite?: boolean;
    looping?: boolean;
    contiguous?: boolean;
};

type RGXTryWalkOptions = {
    revertReduced?: boolean;
    revertShare?: boolean;
    revertCaptures?: boolean;
};

// A validation error from a branch of a union step, whether the branch was dropped or the error was thrown.
type RGXWalkerBranchError = {
    error: RGXPartValidationFailedError;
    capture: RGXCapture; // The capture that failed validation
    tokenPosition: number; // The position of the step in the walker's tokens
};

type RGXWalkerSnapshotKey =
    | "sourcePosition"
    | "tokenPosition"
    | "reduced"
    | "share"
    | "captures"
    | "namedCaptures";

type RGXWalkerSnapshot<R, S> = Partial<{
    sourcePosition: number;
    tokenPosition: number;
    reduced: R;
    share: S;
    captures: RGXCapture[];
    namedCaptures: Record<string, RGXCapture[]>;
}>;

type RGXPartControl = "skip" | "stop" | "silent" | "stop-silent" | void;
type RGXPartLossControl = "stop" | "stop-silent" | void;
type RGXPartLossReason = "no-match" | "not-reached";
type RGXPartLoss<R, S = unknown> = {
    reason: RGXPartLossReason;
    winner: RGXTokenOrPart<R, S>; // The alternative that captured: a part, or a plain token
    capture: RGXCapture;
};

type RGXCapture<T = unknown> = {
    raw: string;
    value: T;
    start: number;
    end: number;
    ownerId: string | null; // The id of the RGXPart that captured this, if any
    branch: number; // The position of the alternative that captured this in the step's flattened union, or 0 if the step isn't a union
    groups: Record<string, string> | null; // The groups captured by the token that captured this (without the walker's branch groups), or null if it has none
};

type RGXPartContext<R, S = unknown, T = string> = {
    part: RGXPart<R, S, T>;
    walker: RGXWalker<R, S>;
};

// A token, or a function that produces one from the walker's current state each time the part is captured.
type RGXPartToken<R, S = unknown, T = string> = RGXToken | ((context: RGXPartContext<R, S, T>) => RGXToken);

type RGXPartOptions<R, S = unknown, T=string> = {
    id: string;
    rawTransform: (captured: string) => string;
    transform: (captured: string) => T;
    validate: (captured: RGXCapture<T>, context: RGXPartContext<R, S, T>) => boolean | string;
    beforeCapture: ((context: RGXPartContext<R, S, T>) => RGXPartControl) | null;
    afterCapture: ((capture: RGXCapture<T>, context: RGXPartContext<R, S, T>) => RGXPartControl) | null;
    afterFailure: ((e: RGXRegexNotMatchedAtPositionError | RGXRegexNotMatchedAfterPositionError, context: RGXPartContext<R, S, T>) => RGXPartControl) | null;
    afterValidationFailure: ((e: RGXPartValidationFailedError, context: RGXPartContext<R, S, T>) => RGXPartControl) | null;
    afterLoss: ((loss: RGXPartLoss<R, S>, context: RGXPartContext<R, S, T>) => RGXPartLossControl) | null;
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
function rgxw<R = unknown, S = unknown, T = unknown>(source: string, {multiline=true, verbatim=true, ...options}: RGXWOptions<R, S> = {}): (strings: TemplateStringsArray, ...tokens: RGXWalkerStep<R, S, T>[]) => RGXWalker<R, S>
```
Creates an `RGXWalker` instance from an interpolation of strings and tokens. The template literal is interpreted as a raw string, meaning any escape sequences are left as-is instead of being resolved to their charcter equivalents. Tokens are checked for acceptance like in `rgxwa`, then passed through. Instead of returning an `ExtRegExp`, it returns an `RGXWalker` that can be used to walk through matches of the regex pattern in the source string.

### Parameters
  - `source` (`string`): An arbitrary string value that will be included in the `source` property of the walker object.
  - `options` (`RGXWOptions<R, S>`, optional): Additional options for configuring the behavior of the resulting `RGXWalker`. This includes:
    - `startingSourcePosition` (`number`, optional): An optional initial value for the walker's `sourcePosition` property, which tracks the current position in the source string during walking. Defaults to `0`.
    - `multiline` (`boolean`, optional): Whether to strip newlines and trim leading whitespace from the literal string parts of the template. Defaults to `true`. When `true`, each literal string part is split by newlines, each line has its leading whitespace trimmed, empty lines are removed, comments (denoted with `//`) ending a line or on a line by themselves are stripped, and the remaining lines are joined together. Interpolated tokens (including string tokens via `${"..."}`) are not affected. When `false`, literal string parts are preserved exactly as written.
    - `verbatim` (`boolean`, optional): Whether to treat literal string parts of the template as verbatim text. Defaults to `true`. When `true`, literal string parts are escaped so that special regex characters are matched literally. When `false`, literal string parts are inserted as raw regex syntax without escaping, as interpolation tokens (see `rgxInterpolation` in [general.md](../general.md)) in the walker's token list. Since each token is matched on its own, each literal part must still be a valid regex by itself, and one with unbalanced parentheses throws an `RGXInvalidWalkerStepError` when the walker is created (see `rgxwa`). Interpolated values (including string tokens via `${"..."}`) are always escaped regardless of this setting.
    - `reduced` (`R`, optional): An optional initial value for the walker's `reduced` property, which can be used to accumulate results across matches.
    - `share` (`S`, optional): An optional initial value for the walker's `share` property, which is passed to all Part callbacks and can be used as shared mutable state across parts without being accumulated in `reduced`.
    - `infinite` (`boolean`, optional): Whether the walker should continue walking even after reaching the end of the token array, matching the final token repeatedly.
    - `looping` (`boolean`, optional): Whether the walker should loop back to the beginning of the token array after reaching the end, continuing to walk indefinitely until the source is consumed or the walker is stopped.
    - `contiguous` (`boolean`, optional): Whether the walker should require each token to match exactly at the current source position (`true`), or search forward for the next match of each token starting from the current position (`false`). Defaults to `true`.

### Returns
- `(strings: TemplateStringsArray, ...tokens: RGXWalkerStep<R, S, T>[]) => RGXWalker<R, S>`: A template tag function that takes a template literal and returns an `RGXWalker` instance configured with the provided source, the provided tokens, and the specified options.

## rgxwa
```typescript
function rgxwa<R = unknown, S = unknown, T = unknown>(source: string, tokens: RGXWalkerStep<R, S, T>[], options: Omit<RGXWOptions<R, S>, "multiline"> = {}): RGXWalker<R, S>
```
As an alternative to using the `rgxw` template tag, you can directly call `rgxwa` with a source string, an array of tokens and/or parts, and options to get an `RGXWalker` instance. This is useful in cases where you don't want to use a template literal. Each plain token and the inner token of each `RGXPart` is checked for acceptance at its position (including tokens nested inside it) by resolving it as the top level of a pattern with no flags, since the walker matches each token on its own without flags (see `rgxAcceptInsertion` in [base.md](./token/base.md)). Because of this, the tokens are resolved once when the walker is created, except for the tokens of dynamic parts, which aren't known until they are captured (see [Dynamic Parts](#dynamic-parts)). Each resolved step is then checked the same way the walker checks it before matching it (see [Step validation](#step-validation)), so problems are found before walking starts. `RGXPart` instances are then passed through to the walker. The provided options are passed through to configure the resulting walker.

#### Parameters
  - `source` (`string`): An arbitrary string value that will be included in the `source` property of the walker object.
  - `tokens` (`RGXWalkerStep<R, S, T>[]`): The tokens and/or parts to form the walker's token sequence. Plain `RGXToken` values are validated; `RGXPart` instances are passed through as-is.
  - `options` (`Omit<RGXWOptions<R, S>, "multiline">`, optional): Additional options for configuring the behavior of the resulting `RGXWalker`, excluding the `multiline` option which is not applicable when not using a template literal. This includes:
    - `startingSourcePosition` (`number`, optional): An optional initial value for the walker's `sourcePosition` property, which tracks the current position in the source string during walking. Defaults to `0`.
    - `reduced` (`R`, optional): An optional initial value for the walker's `reduced` property, which can be used to accumulate results across matches.
    - `share` (`S`, optional): An optional initial value for the walker's `share` property, which is passed to all Part callbacks and can be used as shared mutable state across parts.

#### Returns
- `RGXWalker<R, S>`: An `RGXWalker` instance configured with the provided source, the resolved tokens, and the specified options.

# RGXPart\<R, S=unknown, T=string\>
A class that wraps an `RGXToken` with optional callbacks for use within an `RGXWalker`. The token can also be a function that produces it from the walker's current state each time the part is captured (see [Dynamic Parts](#dynamic-parts)). Unlike plain tokens, Parts can control walker behavior via `beforeCapture` (returning an `RGXPartControl` value) and react to captures via `afterCapture`. Parts are purely definitions and do not store capture state — all captures are stored on the walker as `RGXCapture` objects.

A function `rgxPart` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

## Part Control Values

Each Part callback returns an `RGXPartControl` value. The effect of each value depends on which callback returns it:

| Value | `beforeCapture` | `afterCapture` | `afterFailure` / `afterValidationFailure` |
|---|---|---|---|
| `void`/`undefined` | Proceed normally | Proceed normally; capture is recorded and returned | Re-throw the error |
| `"skip"` | Advance token, return `null`; no capture | Un-register capture, reset source position, advance token, return `null` | Advance token, return `null` without re-throwing |
| `"stop"` | Set `stopped`, return `null`; no advance | Record capture, advance positions normally, set `stopped`, return `null` | Set `stopped`, return `null` without re-throwing |
| `"stop-silent"` | Same as `"stop"` (no capture has occurred yet) | Un-register capture, advance positions normally, set `stopped`, return `null` | Same as `"stop"` |
| `"silent"` | Capture without recording in `captures`/`namedCaptures` | Un-register capture, advance positions normally, return capture result | No distinct effect — error is still re-thrown |

## Dynamic Parts
When a part's token is a function, the walker calls it each time it captures the part, after `beforeCapture`, with an `RGXPartContext` holding the part and the walker. The token it returns is matched as the step. This lets a step depend on what earlier steps captured, such as a closing delimiter that must be the same as the opening one:

```typescript
const walker = rgxwa(source, [
    rgxPart(/["'#]/, { id: "open" }),
    rgxPart(({ walker }) => rgxGroup({ capturing: false }, [
        rgxInterpolation("(?:(?!"), walker.lastCapture("open")!.raw, rgxInterpolation(").)*")
    ])),
    rgxPart(({ walker }) => walker.lastCapture("open")!.raw)
]);
```

`lastCapture(id)` and `lastGroup(name)` on the walker are convenient for reading earlier captures. Things to keep in mind:

- The function returns the whole token for the step, so a value it reads can be placed anywhere inside it. Since each step is matched on its own, there is no backtracking into earlier steps, the same as for any other step.
- The function reads whatever state the walker has when the capture runs, including after `tryWalk` or `restore` roll it back.
- A string the function returns is escaped like any string token, so it matches as text, not as regex syntax. Return a `RegExp` or another token to insert pattern syntax.
- The token isn't known until the part is captured, so `rgxwa` and `rgxw` skip dynamic parts when they check steps at creation (other steps see them as a no-op token among their siblings). The walker checks the produced token when it captures the part instead, including its insertions (see [Step validation](#step-validation)).
- If the function returns something that isn't a valid token, an `RGXInvalidTokenError` is thrown.

## Static Properties
- `check(value: unknown): value is RGXPart`: A type guard that checks if the given value is an instance of `RGXPart`.
- `assert(value: unknown): asserts value is RGXPart`: An assertion that checks if the given value is an instance of `RGXPart`. If the assertion fails, an `RGXInvalidPartError` will be thrown.

## Constructor
```typescript
constructor(token: RGXPartToken<R, S, T>, options?: Partial<RGXPartOptions<R, S, T>>)
```
- `token` (`RGXPartToken<R, S, T>`): The token to wrap, or a function that produces it each time the part is captured (see [Dynamic Parts](#dynamic-parts)).
- `options` (`Partial<RGXPartOptions<R, S, T>>`, optional): Configuration options. Defaults to `{}`.
  - `id` (`string`, optional): An optional identifier for this part. Defaults to `null`, but must be a string if provided.
  - `rawTransform` (`(captured: string) => string`, optional): A function that transforms the raw captured string before it is stored as `raw` on the capture result and before `transform` is applied. Defaults to an identity function.
  - `transform` (`(captured: string) => T`, optional): A function that transforms the captured string into the desired type `T`. Defaults to an identity function that casts the string to `T`.
  - `beforeCapture` (`((context: RGXPartContext<R, S, T>) => RGXPartControl) | null`, optional): Invoked before capturing. Receives an `RGXPartContext` with `part` and `walker`. Returns an `RGXPartControl` value — see [Part Control Values](#part-control-values). Defaults to `null`.
  - `afterCapture` (`((capture: RGXCapture<T>, context: RGXPartContext<R, S, T>) => RGXPartControl) | null`, optional): Invoked after capturing. Receives the typed `RGXCapture<T>` result and an `RGXPartContext` with `part` and `walker`. Returns an `RGXPartControl` value — see [Part Control Values](#part-control-values). Calling `walker.stop()` within this callback is also supported and behaves like returning `void` with a side-effectful stop. Defaults to `null`.
  - `afterFailure` (`((e: RGXRegexNotMatchedAtPositionError | RGXRegexNotMatchedAfterPositionError, context: RGXPartContext<R, S, T>) => RGXPartControl) | null`, optional): Invoked when the regex match fails (an `RGXRegexNotMatchedAtPositionError` or `RGXRegexNotMatchedAfterPositionError` is thrown, depending on whether the walker is in contiguous mode). Receives the error and an `RGXPartContext` with `part` and `walker`. Returns an `RGXPartControl` value — see [Part Control Values](#part-control-values). Defaults to `null`.
  - `afterValidationFailure` (`((e: RGXPartValidationFailedError, context: RGXPartContext<R, S, T>) => RGXPartControl) | null`, optional): Invoked when validation fails (`RGXPartValidationFailedError` is thrown). Receives the error and an `RGXPartContext` with `part` and `walker`. Returns an `RGXPartControl` value — see [Part Control Values](#part-control-values). Defaults to `null`.
  - `afterLoss` (`((loss: RGXPartLoss<R, S>, context: RGXPartContext<R, S, T>) => RGXPartLossControl) | null`, optional): Invoked when the part is a branch of a union step and another branch captured (see [Unions of Parts](#unions-of-parts)). Receives an `RGXPartLoss` with the `reason`, the `winner` and its `capture`, and an `RGXPartContext` with `part` and `walker`. Returns `void`, `"stop"`, or `"stop-silent"`. Defaults to `null`.
  - `validate` (`((capture: RGXCapture<T>, context: RGXPartContext<R, S, T>) => boolean | string) | null`, optional): A callback invoked during validation after capturing and transforming, but before `afterCapture`. Receives the capture result and an `RGXPartContext` object containing `part` and `walker`. Returns `true` if validation passes, `false` to fail with a generic error, or a string to fail with that string as the error message. Defaults to `null`.

## Properties
- `id` (`string | null`): An optional identifier for this part.
- `token` (`RGXPartToken<R, S, T>`): The wrapped token, or the function that produces it.
- `rawTransform` (`(captured: string) => string`, readonly): The raw transform function applied to the matched string before it is stored as `raw` and before `transform` is called.
- `transform` (`(captured: string) => T`, readonly): The transform function used to convert captured strings to values of type `T`.
- `beforeCapture` (`((context: RGXPartContext<R, S, T>) => RGXPartControl) | null`, readonly): The before-capture callback, or `null`.
- `afterCapture` (`((capture: RGXCapture<T>, context: RGXPartContext<R, S, T>) => RGXPartControl) | null`, readonly): The after-capture callback, or `null`.
- `afterFailure` (`((e: RGXRegexNotMatchedAtPositionError | RGXRegexNotMatchedAfterPositionError, context: RGXPartContext<R, S, T>) => RGXPartControl) | null`, readonly): The after-failure callback, or `null`.
- `afterValidationFailure` (`((e: RGXPartValidationFailedError, context: RGXPartContext<R, S, T>) => RGXPartControl) | null`, readonly): The after-validation-failure callback, or `null`.
- `afterLoss` (`((loss: RGXPartLoss<R, S>, context: RGXPartContext<R, S, T>) => RGXPartLossControl) | null`, readonly): The after-loss callback, or `null`.

## Methods
- `clone(depth: CloneDepth = "max") => RGXPart`: Creates a clone of this part. When `depth` is `0`, returns `this`; otherwise, returns a new `RGXPart` with a cloned token (or the same function, for a dynamic part) and the same `rawTransform`, `transform`, `beforeCapture`, `afterCapture`, `afterFailure`, `afterValidationFailure`, and `afterLoss` references.
- `hasId() => this is RGXPart<R, S, T> & { id: string }`: A type guard that checks if this part has a non-null `id`. If `true`, narrows the type to indicate that `id` is a string.
- `isDynamic() => this is RGXPart<R, S, T> & { token: (context: RGXPartContext<R, S, T>) => RGXToken }`: A type guard that checks if this part's token is a function (see [Dynamic Parts](#dynamic-parts)).
- `resolveToken(walker: RGXWalker<R, S>) => RGXToken`: Returns the token to match this part with. For a static part, this is `token`. For a dynamic part, this calls `token` with `{ part: this, walker }` and returns the result, throwing an `RGXInvalidTokenError` if it isn't a valid token. The walker calls this each time it captures the part.
- `validate(capture: RGXCapture<T>, context: RGXPartContext<R, S, T>) => void`: A method that calls the inner passed validation logic for this part, if any. If it returns `false`, a generic `RGXPartValidationFailedError` is thrown. If it returns a string, an `RGXPartValidationFailedError` is thrown with that string as the message. If it returns `true`, validation passed. This is called internally by the walker after capturing and transforming a part, before invoking `afterCapture`.

# RGXWalker\<R, S=unknown\>
A class that walks through a sequence of RGX tokens (and/or `RGXPart` instances), matching each against a source string at the current position. The walker maintains a source position and a token position, advancing through both as tokens are matched. When an `RGXPart` is encountered, its `beforeCapture` callback can control behavior via return values (`RGXPartControl`), and its `afterCapture` callback is invoked with the typed capture result. All captures are stored as structured `RGXCapture` objects on the walker, and captures with ids are stored in the `namedCaptures` property also. The generic type `R` represents a user-defined "reduced" value that accumulates the ultimate result of the walk (e.g., built up via `RGXPart` callbacks and returned by `walk()`). The generic type `S` represents a user-defined "shared" value that works almost exactly like `reduced` — it is mutable state that parts can read and write via `context.walker.share` — but it is not considered the ultimate result of the walker. This means parts can freely contribute to `share` without those contributions needing to conform to type `R`, making `share` suitable for intermediate bookkeeping state while `reduced` carries the final result.

A function `rgxWalker` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

## Unions of Parts
A step can be a union of parts and plain tokens, written as an array nested to any depth, such as `[wordPart, numberPart]` (or `${[wordPart, numberPart]}` in `rgxw`). Every union reachable only through other unions is flattened: nested arrays and `RGXClassUnionToken`s. Each alternative of the flattened union is a branch, numbered by its position, and that number is the capture's `branch`. A part counts as one branch, even if its own token is a union. When a step is a single part, the branches are the alternatives of its token instead, flattened the same way, and the part handles all of them.

The union is compiled into one regex, so the regex engine picks the branch the same way it picks an alternative: the first one, from left to right, that matches. The part that owns the branch that matched handles the capture: its `rawTransform`, `transform`, `validate` and `afterCapture` run, and the capture's `ownerId` is its `id`. A plain token branch is captured like a plain token step. The steps are:

1. **`beforeCapture`** runs on every part, in order. `"skip"` leaves that part out of this attempt, and if every branch is left out, the step is skipped. `"stop"` stops the walker right away. `"silent"` means that part's capture isn't recorded if it wins.
2. **The union is matched.** If no branch matches, `afterFailure` runs on every part that is still in the attempt, in order. The first directive other than `void` decides what happens, and if there is none, the error is thrown.
3. **Validation.** If the winning part's capture fails validation, its `afterValidationFailure` runs. `"skip"` and `"stop"` act as they do for a single part. Otherwise, the walker matches the union again without that branch, so the next branch that matches gets a chance. If no branch is left, the validation error is thrown. A branch that failed validation doesn't get `afterFailure` or `afterLoss` afterwards. The validation error of each branch that failed this way, including the one that is thrown when no branch is left, is recorded in the walker's `branchErrors` for the step, so it can be inspected for debugging even when another branch captures. Errors that `afterValidationFailure` handled with `"skip"` or `"stop"` aren't recorded.
4. **`afterLoss`** runs on every other part that was still in the attempt, in branch order, before the winner's `afterCapture`. Its `reason` is `"no-match"` for a branch before the winner (it was tried at the winning position and didn't match there) and `"not-reached"` for a branch after it (the engine never tried it). The step already captured, so it can only return `"stop"` (record the capture, advance, and stop the walker, without calling the winner's `afterCapture`) or `"stop-silent"` (the same, but the capture isn't recorded). The first of these that any part returns decides.
5. **`afterCapture`** runs on the winner, as for a single part.

The walker wraps each branch in a group named `rgx_branch_<index>` to find out which one matched, so numeric backreferences can't be used in a union step (see [Step validation](#step-validation)). These groups are left out of the capture's `groups`. Dynamic parts in a union produce their token after every `beforeCapture` has run. `stepToPart` only stops at steps that are a single part.

## Static Properties
- `check(value: unknown): value is RGXWalker`: A type guard that checks if the given value is an instance of `RGXWalker`.
- `assert(value: unknown): asserts value is RGXWalker`: An assertion that checks if the given value is an instance of `RGXWalker`. If the assertion fails, an `RGXInvalidWalkerError` will be thrown.

## Constructor
```typescript
constructor(source: string, tokens: RGXWalkerStep<R, S>[], options?: RGXWalkerOptions<R, S>)
```
- `source` (`string`): The string to walk through, matching tokens against.
- `tokens` (`RGXWalkerStep<R, S>[]`): The tokens (and/or `RGXPart` instances) to match sequentially. Plain `RGXToken` values and `RGXPart` instances can be mixed freely, and a step can be an array of them, nested to any depth, to match one of them (see [Unions of Parts](#unions-of-parts)).
- `options` (`RGXWalkerOptions<R, S>`, optional): Configuration options. Defaults to `{}`.
  - `startingSourcePosition` (`number`, optional): The starting index in the source string. Defaults to `0`.
  - `reduced` (`R`, optional): The initial value for the `reduced` accumulator. Defaults to `null`.
  - `share` (`S`, optional): The initial value for the `share` property, passed to all Part callbacks. Defaults to `null`.
  - `infinite` (`boolean`, optional): When `true`, the walker stays at the last token indefinitely rather than stopping when the token collection is exhausted, continuing to match the last token until the source is consumed. Defaults to `false`.
  - `looping` (`boolean`, optional): When `true`, the walker loops back to token position `0` when the token collection is exhausted, continuing to match from the start until the source is consumed. Defaults to `false`.
  - `contiguous` (`boolean`, optional): When `true`, each token must match exactly at the current source position (via `assertRegexMatchesAtPosition`). When `false`, each token is searched for anywhere at or after the current source position (via `assertRegexMatchesAfterPosition`), allowing gaps between matches. Defaults to `true`.

## Step validation
Each step (a plain token, or a part's inner token) is matched on its own as a finished pattern with no flags, so before matching it, the walker resolves it and checks it. `rgxwa` and `rgxw` run the same checks on every step when the walker is created, so a walker built with them finds these problems before walking starts. Dynamic parts are the exception: their token is checked, along with its insertions at the part's position, each time the walker captures them. A walker created directly with the constructor finds them when it reaches the step. The checks are:

- **Balanced parentheses.** An interpolation token may leave a group open for a later token to close (see `rgxInterpolation` in [general.md](../general.md)), but nothing can close it in a separate step. A step with unbalanced parentheses throws an `RGXInvalidWalkerStepError`. When `rgxwa` finds it, the error's `index` is the step's position in the tokens.
- **Backreferences.** The step's backreferences are validated like a pattern built with `rgxa` (see [Backreference validation](../general.md#backreference-validation)), throwing `RGXInvalidBackreferenceError` or `RGXDuplicateGroupNameError`. Since each step is matched on its own, a backreference can't point to a group in another step.
- **Reserved group names.** The walker wraps each branch of a union step in a group named `rgx_branch_<index>` to find out which branch matched, so a group name starting with `rgx_branch_` in a step throws an `RGXReservedGroupNameError`.
- **Numeric backreferences in unions.** The branch groups shift the number of every group in a union step, so a numeric backreference in one (such as `\1`, or an `RGXSubpatternToken` for a number) throws an `RGXInvalidBackreferenceError` with the reason `"numeric-in-branches"`. Use a named group and reference it by name instead.

## Properties
- `source` (`string`): The source string being walked (readonly).
- `sourcePosition` (`number`): The current index in the source string. Range is `[0, source.length]` inclusive, where `source.length` represents "fully consumed". Setting this validates that the value is >= 0 and <= `source.length`, throwing `RGXOutOfBoundsError` if not. Non-integer values are floored before being stored.
- `tokens` (`RGXWalkerStep<R, S>[]`): The array of tokens and/or parts to match against (readonly).
- `tokenPosition` (`number`): The current index in the token collection. Setting this validates that the value is >= 0 and <= `tokens.length`, throwing `RGXOutOfBoundsError` if not. Non-integer values are floored before being stored.
- `reduced` (`R`): The ultimate result value of the walk. Typically built up by `RGXPart` callbacks during walking and returned directly by `walk()`. All contributions to `reduced` must conform to type `R`.
- `share` (`S`): A shared mutable value that works almost exactly like `reduced` — parts can read and write it freely via `context.walker.share` — but it is not considered the ultimate result of the walker. This means parts can contribute to `share` without those contributions needing to adhere to type `R`, making `share` well-suited for intermediate bookkeeping, cross-part coordination, or any accumulated state that is not itself the final answer.
- `captures` (`RGXCapture[]`): An array of structured capture results recorded during walking. Each entry has a `raw` string (the `rawTransform` result for Parts, or the matched string for plain tokens), a `value` (the `transform` result for Parts, or the matched string for plain tokens), `start` and `end` indices in the source string, an `ownerId` that is the `id` of the Part that produced it (or `null` for captures from plain tokens or parts without ids), a `branch` index indicating which alternative of a union step (or of a part's union token) was matched, counted in the flattened union (or `0` if the step isn't a union), and the `groups` the match captured, without the walker's branch groups (or `null` if there are none).
- `namedCaptures` (`Record<string, RGXCapture[]>`): An object mapping capture IDs to their corresponding `RGXCapture` results. Only Parts with non-null IDs are included. The captures occur in the same order as they appear in the `captures` array.
- `branchErrors` (`RGXWalkerBranchError[]`): The validation errors of the union branches that failed in the latest `step()` (see [Unions of Parts](#unions-of-parts)), in the order they happened, including the error that was thrown if no branch was left. Each entry has the `error` (an `RGXPartValidationFailedError`), the `capture` that failed validation (with its `branch` and `ownerId`), and the `tokenPosition` of the step. Each step starts a new array, so an array read after one step keeps that step's errors. After a walk throws, it holds the errors of the step that threw. Steps that aren't unions of parts leave it empty.
- `infinite` (`boolean`): Whether the walker is in infinite mode — stays at the last token when the token collection is exhausted until the source is consumed.
- `looping` (`boolean`): Whether the walker is in looping mode — loops back to token position `0` when the token collection is exhausted until the source is consumed.
- `contiguous` (`boolean`): Whether the walker requires each token to match exactly at the current source position. When `false`, the walker searches forward for the next match instead.
- `stopped` (`boolean`, readonly): Whether the walker has been stopped. Set to `true` when any Part callback returns `"stop"` or `"stop-silent"`, or when `stop()` is called directly.

## Methods
- `stop() => this`: Sets `stopped` to `true`, causing any active `stepToToken`, `stepToTokenAsync`, `stepToPart`, `stepToPartAsync`, `walk`, or `walkAsync` loop to halt after the current iteration. Typically called from an `afterCapture` callback to stop walking after the current capture.
- `atTokenEnd() => boolean`: Returns `true` if the token position is at or past the end of the token collection.
- `atLastToken() => boolean`: Returns `true` if the token position is at the last token in the collection (i.e., `tokenPosition === tokens.length - 1`).
- `hasNextToken(predicate?: (token: RGXWalkerStep<R, S, unknown>) => boolean) => boolean`: Returns `true` if there is a current token and it satisfies the optional predicate (defaults to `() => true`).
- `atSourceEnd() => boolean`: Returns `true` if the source has been fully consumed (`sourcePosition >= source.length`).
- `hasNextSource(predicate?: (rest: string) => boolean) => boolean`: Returns `true` if the source is not fully consumed and the remaining source satisfies the optional predicate (defaults to `() => true`).
- `lastCapture(id?: string) => RGXCapture | null`: Returns the last entry in `captures`, or `null` if empty. With an `id`, returns the last entry in `namedCaptures[id]` instead, or `null` if the part with that id hasn't been captured.
- `lastGroup(name: string) => string | null`: Returns what the group with the given name captured in the latest capture that matched it, searching `captures` from the end, or `null` if no capture did. Unlike `namedCaptures`, which is keyed by part id, this looks up regex group names.
- `currentToken() => RGXWalkerStep<R, S>`: Returns the token or part at the current token position. Throws `RGXCurrentTokenNotFoundError` if called when `atTokenEnd()` is `true`.
- `remainingSource() => string | null`: Returns the remaining source string from the current position onward, or `null` if the source is fully consumed.
- `capture(token: RGXWalkerStep<R, S>, includeMatch?: false) => string`: Resolves the token (or part's inner token) to a regex, checks it as described in [Step validation](#step-validation), and attempts a match. Unlike `step()`, it doesn't wrap the branches of a union in branch groups, and it doesn't call any part's callbacks: each part is matched with its token (produced now, for a dynamic part). In contiguous mode, asserts that the regex matches exactly at the current source position (throwing `RGXRegexNotMatchedAtPositionError` if not). In non-contiguous mode, searches for the next match at or after the current position (throwing `RGXRegexNotMatchedAfterPositionError` if none is found), and the source position advances to the end of that match. Returns the matched string.
- `capture(token: RGXWalkerStep<R, S>, includeMatch: true) => RegExpExecArray`: Same as above, but returns the full `RegExpExecArray` from the match instead of just the matched string.
- `step() => RGXCapture | null`: Steps through the next token in the collection. For `RGXPart` tokens, invokes `beforeCapture`, then attempts a match, then validates, then invokes `afterCapture` — each callback's return value controls walker behavior as described in [Part Control Values](#part-control-values). Union steps are matched as described in [Unions of Parts](#unions-of-parts). Returns the `RGXCapture` result on success, or `null` if there are no more tokens (or no more source in `infinite`/`looping` mode), the step was skipped, or the walker was stopped. **Special case**: in `infinite` + non-contiguous mode, if the last token has already been matched at least once and subsequently cannot be found in the remaining source (an `RGXRegexNotMatchedAfterPositionError` would otherwise be thrown), the walker gracefully stops instead of propagating the error.
- `stepToToken(predicate?: (token: RGXWalkerStep<R, S>) => boolean) => this`: Steps through tokens until the predicate returns `true` for the current token or the walker is stopped. The matching token is not consumed. Predicate defaults to `() => true`, which stops immediately at the current token without advancing.
- `stepToTokenAsync(predicate?: (token: RGXWalkerStep<R, S, unknown>) => boolean, yieldFn?: () => Promise<void>) => Promise<this>`: Async variant of `stepToToken`. Between each step, awaits `yieldFn()` to yield control to the event loop. Predicate defaults to `() => true`. `yieldFn` defaults to a function that schedules a `setImmediate` callback, yielding once per step between tokens.
- `stepToPart(predicate?: (part: RGXPart<R, S, unknown>) => boolean) => this`: Steps through tokens until the next `RGXPart` satisfying the predicate is reached. If already at a Part, steps once first to move past it. The matching Part is not consumed.
- `stepToPartAsync(predicate?: (part: RGXPart<R, S, unknown>) => boolean, yieldFn?: () => Promise<void>) => Promise<this>`: Async variant of `stepToPart`. If already at a Part, steps past it first (without yielding). Then delegates to `stepToTokenAsync` with a predicate that filters for `RGXPart` instances satisfying the given predicate. `yieldFn` defaults to a `setImmediate`-based yield.
- `walk() => R`: Steps through all remaining tokens until the end of the token collection (or until the source is consumed in `infinite`/`looping` mode) or the walker is stopped. Returns the walker's `reduced` value after walking completes.
- `walkAsync(yieldFn?: () => Promise<void>) => Promise<R>`: Async variant of `walk`. Delegates to `stepToTokenAsync(() => false, yieldFn)` and returns the walker's `reduced` value. `yieldFn` defaults to a `setImmediate`-based yield.
- `tryWalk(options?: RGXTryWalkOptions) => boolean`: Like `walk()`, but resets positions to their values before the walk started if the walk fails (not being stopped, but throwing an error). Returns `true` if the walk succeeded or was stopped, or `false` if it failed due to either a pattern not matching or validation failure. If an unexpected error is encountered, the error is re-thrown, but the position reset still occurs. The optional `options` parameter accepts an `RGXTryWalkOptions` object with the following fields:
  - `revertReduced` (`boolean`, optional): When `true`, the `reduced` value is deep-cloned before the walk and restored if the walk fails. Defaults to `false`.
  - `revertShare` (`boolean`, optional): When `true`, the `share` value is deep-cloned before the walk and restored if the walk fails. Defaults to `false`.
  - `revertCaptures` (`boolean`, optional): When `true`, both `captures` and `namedCaptures` are deep-cloned before the walk and restored if the walk fails. Defaults to `false`.
- `tryWalkAsync(options?: RGXTryWalkOptions, yieldFn?: () => Promise<void>) => Promise<boolean>`: Async variant of `tryWalk`. Like `walkAsync()`, but snapshots and restores state on failure. Returns a `Promise<boolean>` — `true` if the walk succeeded or was stopped, `false` if it failed due to a match or validation error. Unexpected errors are re-thrown after restoring state. Accepts the same `options` as `tryWalk`.
- `snapshot(name: string, ...keys: Array<RGXWalkerSnapshotKey | false>) => this`: Saves the current values of the listed walker fields under `name`, so they can be put back later with `restore(name)`. Only the listed keys are saved; a snapshot taken with no keys saves nothing and restoring it changes nothing. `sourcePosition` and `tokenPosition` are copied as numbers, while `reduced`, `share`, `captures`, and `namedCaptures` are deep-cloned (`extClone` with depth `"max"`), so later changes to the walker do not affect what was saved. `false` entries in `keys` are ignored, which allows keys to be included conditionally (e.g., `walker.snapshot("before", "sourcePosition", keepCaptures && "captures")`). Taking a snapshot with a name that already exists replaces the previous one. Snapshots are stored per walker instance and are not copied by `clone()`. Note that the walker uses some names internally: `step` (and so every stepping and walking method) saves under `"step"`, and `tryWalk` and `tryWalkAsync` save under `"tryWalk"`, so a snapshot saved under either name is overwritten when those methods run.
- `restore(name: string) => this`: Restores the fields saved by the snapshot named `name`, leaving every field that snapshot did not include untouched. Positions are set through the `sourcePosition` and `tokenPosition` setters. If no snapshot with that name exists, does nothing. The snapshot remains stored after restoring, and its `reduced`, `share`, `captures`, and `namedCaptures` values are deep-cloned again when restored, so later changes to the walker never affect the stored snapshot and the same snapshot can be restored any number of times.
- `clone(depth: CloneDepth = "max") => RGXWalker`: Creates a clone of the walker. When `depth` is `0`, returns `this`; otherwise, creates a new `RGXWalker` with cloned tokens, source position, reduced value, share value, captures, branch errors, stopped state, and the `infinite`/`looping`/`contiguous` flags.
