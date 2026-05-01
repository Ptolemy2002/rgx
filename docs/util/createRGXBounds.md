# Type Reference
The following is a reference to types relevant to the function listed in this file. The full type reference for the library can be found in [type-reference.md](../type-reference.md).

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
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXToken[];

type CreateRGXBoundsOptions = {
    flags?: string;
    anchorStart?: boolean;
    anchorEnd?: boolean;
    inner?: boolean;
};
```

# createRGXBounds
```typescript
function createRGXBounds(positive: RGXToken, negative: RGXToken, options?: CreateRGXBoundsOptions | string | boolean): [RGXConvertibleToken, RGXConvertibleToken]
```
Creates a pair of boundary tokens representing the start and end of a region defined by a `positive` pattern, delimited by a `negative` pattern. The returned tokens are zero-width assertions (they consume no characters) that can be inserted into an RGX pattern to match at the edges of the positive region.

The first element of the returned tuple is the start bound and the second element is the end bound. When `inner` is `true` (the default), both bounds assert the `positive` pattern in addition to `negative`: the start bound is `(?<=negative|^)(?=positive)`, which only fires where `negative` ends and `positive` begins; the end bound is `(?<=positive)(?=negative|$)`, which only fires where `positive` ends and `negative` begins. When `inner` is `false`, the `positive` assertion is dropped entirely: the start bound becomes `(?<=negative|^)` (fires at every position immediately after `negative` or the start of string, regardless of what follows) and the end bound becomes `(?=negative|$)` (fires at every position immediately before `negative` or the end of string, regardless of what precedes). Both tokens have `rgxGroupWrap: false`, `rgxIsGroup: false`, and `rgxIsRepeatable: false`, since boundary assertions do not consume characters and cannot be meaningfully repeated or group-wrapped.

Both `positive` and `negative` are resolved without group wrapping before being embedded into the lookbehind and lookahead. If either token is a convertible token with an explicit `rgxGroupWrap` preference, that preference is overridden to `false` for the top-level resolution.

## Parameters
  - `positive` (`RGXToken`): The token representing the pattern that defines the region being bounded.
  - `negative` (`RGXToken`): The token representing the surrounding/delimiter pattern that flanks the region.
  - `options` (`CreateRGXBoundsOptions | string | boolean`, optional): Either an options object, a flags string (for backwards compatibility), or a boolean to set both `anchorStart` and `anchorEnd`.
    - `flags` (`string`, optional): Regex flags to use when resolving the tokens and constructing the bound expressions. Passed as `currentFlags` to `resolveRGXToken` and as the flags for the internal `ExtRegExp`. Defaults to `''`.
    - `anchorStart` (`boolean`, optional): When `true`, the start bound also matches the very beginning of the string (adds `|^` to the lookbehind). Defaults to `true`.
    - `anchorEnd` (`boolean`, optional): When `true`, the end bound also matches the very end of the string (adds `|$` to the lookahead). Defaults to `true`.
    - `inner` (`boolean`, optional): When `true`, each bound also asserts the `positive` pattern — the start bound fires only where `negative` ends and `positive` begins, and the end bound fires only where `positive` ends and `negative` begins. When `false`, the `positive` assertion is omitted from both bounds, so each bound fires at every position adjacent to `negative` (or the string edge) regardless of whether `positive` is present. Defaults to `true`.

## Returns
- `[RGXConvertibleToken, RGXConvertibleToken]`: A tuple of `[startBound, endBound]`. When `inner` is `true` (default), `startBound` matches the position immediately after `negative` (or the start of the string when `anchorStart` is `true`) and immediately before `positive`; `endBound` matches the position immediately after `positive` and immediately before `negative` (or the end of the string when `anchorEnd` is `true`). When `inner` is `false`, `startBound` matches every position immediately after `negative` (or the start of the string) regardless of what follows, and `endBound` matches every position immediately before `negative` (or the end of the string) regardless of what precedes.
