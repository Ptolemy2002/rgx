# Type Reference
The following is a reference to types relevant to the function listed in this file. The full type reference for the library can be found in [type-reference.md](../../type-reference.md).

```typescript
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
```

# toRGXClassToken
```typescript
function toRGXClassToken(token: RGXToken): RGXClassToken
```
Converts any `RGXToken` into an appropriate `RGXClassToken` subclass, giving you access to the extended API that class tokens provide. Tokens that are already class tokens are returned as-is. Array tokens and `RGXTokenCollection` instances in union mode are converted to `RGXClassUnionToken`. `RGXTokenCollection` instances in concat mode are converted to a non-capturing `RGXGroupToken`. All other tokens are wrapped in an `RGXClassWrapperToken`.

## Returns
- `RGXClassToken`: The corresponding class token:
  - `RGXClassUnionToken` for array tokens and union-mode `RGXTokenCollection` instances.
  - `RGXGroupToken` (non-capturing) for concat-mode `RGXTokenCollection` instances.
  - `RGXClassWrapperToken` for all other tokens.