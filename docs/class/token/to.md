# Type Reference
The following is a reference to types relevant to the function listed in this file. The full type reference for the library can be found in [type-reference.md](../../type-reference.md).

```typescript
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

# toRGXClassToken
```typescript
function toRGXClassToken(token: RGXToken): RGXClassToken
```
Converts any `RGXToken` into an appropriate `RGXClassToken` subclass, giving you access to the extended API that class tokens provide. JSON object tokens are first converted with `rgxTokenFromJSON` (see [json.md](../../json.md)), so a JSON class token becomes the class token it describes and a JSON literal token becomes an `ExtRegExp`, which is then handled like any other literal. Tokens that are already class tokens are returned as-is. Array tokens and `RGXTokenCollection` instances in union mode are converted to `RGXClassUnionToken`. `RGXTokenCollection` instances in concat mode are converted to a non-capturing `RGXGroupToken`. All other tokens are wrapped in an `RGXClassWrapperToken`.

## Returns
- `RGXClassToken`: The corresponding class token:
  - The described class token for JSON class tokens.
  - `RGXClassUnionToken` for array tokens and union-mode `RGXTokenCollection` instances.
  - `RGXGroupToken` (non-capturing) for concat-mode `RGXTokenCollection` instances.
  - `RGXClassWrapperToken` for all other tokens.