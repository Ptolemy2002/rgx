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
```

# createRGXBounds
```typescript
function createRGXBounds(positive: RGXToken, negative: RGXToken, flags?: string): [RGXConvertibleToken, RGXConvertibleToken]
```
Creates a pair of boundary tokens representing the start and end of a region defined by a `positive` pattern, delimited by a `negative` pattern. The returned tokens are zero-width assertions (they consume no characters) that can be inserted into an RGX pattern to match at the edges of the positive region.

The first element of the returned tuple is the start bound: a lookahead/lookbehind pair asserting that `negative` precedes the current position and `positive` follows it (`(?<=negative)(?=positive)`). The second element is the end bound: the inverse assertion (`(?<=positive)(?=negative)`). Both tokens have `rgxGroupWrap: false`, `rgxIsGroup: false`, and `rgxIsRepeatable: false`, since boundary assertions do not consume characters and cannot be meaningfully repeated or group-wrapped.

Both `positive` and `negative` are resolved without group wrapping before being embedded into the lookbehind and lookahead. If either token is a convertible token with an explicit `rgxGroupWrap` preference, that preference is overridden to `false` for the top-level resolution.

## Parameters
  - `positive` (`RGXToken`): The token representing the pattern that defines the region being bounded.
  - `negative` (`RGXToken`): The token representing the surrounding/delimiter pattern that flanks the region.
  - `flags` (`string`, optional): Regex flags to use when resolving the tokens and constructing the bound expressions. Passed as `currentFlags` to `resolveRGXToken` and as the flags for the internal `ExtRegExp`. Defaults to `''`.

## Returns
- `[RGXConvertibleToken, RGXConvertibleToken]`: A tuple of `[startBound, endBound]`, where `startBound` matches the position immediately after `negative` and immediately before `positive` (the start of the positive region), and `endBound` matches the position immediately after `positive` and immediately before `negative` (the end of the positive region).
