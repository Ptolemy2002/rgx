# Type Reference
The following is a reference to types relevant to the class listed in this file. The full type reference for the library can be found in [type-reference.md](../../../type-reference.md).

```typescript
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
```

# RGXLookbehindToken
A class representing a lookbehind assertion. Positive lookbehinds (`(?<=...)`) match if the pattern is present behind, while negative lookbehinds (`(?<!...)`) match if the pattern is absent. This is typically created via the `asLookbehind()` method on `RGXClassToken`, but can also be instantiated directly.

A function `rgxLookbehind` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

## Constructor
Inherited from `RGXLookaroundToken`.

```typescript
constructor(tokens?: RGXTokenCollectionInput, positive?: boolean)
```
- `tokens` (`RGXTokenCollectionInput`, optional): The tokens to include in the lookaround. Internally stored as an `RGXTokenCollection` in 'concat' mode. Defaults to an empty array. If `tokens` is an `RGXTokenCollection` in 'union' mode, it is kept as a single element of the concat collection, so the alternation is preserved rather than its tokens being concatenated.
- `positive` (`boolean`, optional): Whether the lookaround is positive (matches if the pattern is present) or negative (matches if the pattern is absent). Defaults to `true`.

## Static Properties
- `check(value: unknown): value is RGXLookbehindToken`: A type guard that checks if the given value is an instance of `RGXLookbehindToken`.
- `assert(value: unknown): asserts value is RGXLookbehindToken`: An assertion that checks if the given value is an instance of `RGXLookbehindToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.
- `fromJSON(json: RGXJSONClassToken): RGXLookbehindToken`: Constructs an `RGXLookbehindToken` from a JSON class token, passing `rgxTokenFromJSON(tokens)` (or `[]` when omitted) and `positive` (or `true` when omitted) to the constructor. Throws `RGXInvalidJSONTokenError` if `json` is not a JSON class token for `"RGXLookbehindToken"`, and `RGXJSONClassArgsValidationFailedError` if the arguments are invalid. The JSON arguments are `[tokens?, positive?]`, where `tokens`, if present, must be a JSON token (typically an array of JSON tokens) and `positive`, if present, must be a boolean. Nested JSON tokens only have their shape checked here, since converting them validates their contents (throwing the corresponding error).

## Properties
Inherited from `RGXLookaroundToken`.

- `tokens` (`RGXTokenCollection`): The internal collection of tokens managed in 'concat' mode.
- `positive` (`boolean`): Whether the lookaround is positive. Setting this updates `negative` accordingly.
- `negative` (`boolean`): Whether the lookaround is negative. Setting this updates `positive` accordingly.

These properties only have getters.
- `rgxIsRepeatable` (`undefined`): Not set, since lookaround assertions are detected as consuming no characters, which makes them non-repeatable.

## Methods
- `negate() => RGXLookbehindToken`: Returns a new `RGXLookbehindToken` with the opposite positivity, preserving the original tokens.
- `reverse() => RGXLookaheadToken`: Returns a new `RGXLookaheadToken` with the same tokens and positivity.
- `toRgx(currentFlags?: string) => RegExp`: Resolves the lookbehind to a `RegExp`. Positive lookbehinds produce `(?<=...)` and negative lookbehinds produce `(?<!...)`. `currentFlags` (`string`, optional, defaults to `''`) is the flags in effect where the token is placed, including those set by enclosing flag-modifier groups; the tokens inside are resolved with it, and the returned `RegExp` carries its localizable and unicode flags, so resolving the result in that context leaves those flags alone.
- `clone(depth?: CloneDepth) => RGXLookbehindToken`: Creates a clone of this instance to a specified depth: `0` for no clone, `1` for a shallow clone of the top-level token, any other number for that many levels down, and `"max"` (the default) for a full deep clone.
- `toJSON() => RGXJSONClassToken`: Returns a JSON class token with `class` set to `"RGXLookbehindToken"` and `args` set to `[tokens, positive]`, where `tokens` is the array of this token's tokens converted with `rgxTokenToJSON`. The result is accepted by `fromJSON` and by `rgxTokenFromJSON` (see [../../../json.md](../../../json.md)). Nested tokens are converted with `rgxTokenToJSON`, so plain convertible tokens inside this token are resolved into JSON literal tokens.