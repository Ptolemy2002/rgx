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
function createRGXBounds(before: RGXToken, after: RGXToken, flags?: string): [RGXConvertibleToken, RGXConvertibleToken]
```
Creates a pair of boundary tokens representing the start and end of a region delimited by `before` and `after` patterns. The returned tokens are zero-width assertions (they consume no characters) that can be inserted into an RGX pattern to match at the edges of such a region.

The first element of the returned tuple is the start bound: a lookahead/lookbehind pair asserting that `before` precedes the current position and `after` follows it (`(?<=before)(?=after)`). The second element is the end bound: the inverse assertion (`(?<=after)(?=before)`). Both tokens have `rgxGroupWrap: false`, `rgxIsGroup: false`, and `rgxIsRepeatable: false`, since boundary assertions do not consume characters and cannot be meaningfully repeated or group-wrapped.

Both `before` and `after` are resolved without group wrapping before being embedded into the lookbehind and lookahead. If either token is a convertible token with an explicit `rgxGroupWrap` preference, that preference is overridden to `false` for the top-level resolution.

## Parameters
  - `before` (`RGXToken`): The token representing the pattern that must appear before the region.
  - `after` (`RGXToken`): The token representing the pattern that must appear after the region.
  - `flags` (`string`, optional): Regex flags to use when resolving the tokens and constructing the bound expressions. Passed as `currentFlags` to `resolveRGXToken` and as the flags for the internal `ExtRegExp`. Defaults to `''`.

## Returns
- `[RGXConvertibleToken, RGXConvertibleToken]`: A tuple of `[startBound, endBound]`, where `startBound` matches the position immediately after `before` and immediately before `after`, and `endBound` matches the position immediately after `after` and immediately before `before`.
