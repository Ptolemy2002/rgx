# Type Reference
The following is a reference to types relevant to the function listed in this file. The full type reference for the library can be found in [type-reference.md](../type-reference.md).

```typescript
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
```

# cloneRGXToken
```typescript
function cloneRGXToken<T extends RGXToken>(token: T, depth: CloneDepth="max"): T
```
Creates a clone of the given RGX token to the given depth, provided that the token is not a no-op or native token.

## Parameters
  - `token` (`T`): The RGX token to clone. Must not be a no-op or native token, or an error will be thrown.
  - `depth` (`CloneDepth`, optional): The depth to which to clone the token. Can be a number (with 0 resulting in no clone at all and 1 resulting in a shallow clone) or the string `"max"` for a full deep clone. Defaults to `"max"`.

## Returns
- `T`: The cloned token.