# Type Reference
The following is a reference to types relevant to the class listed in this file. The full type reference for the library can be found in [type-reference.md](../../type-reference.md).

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
type RGXJSONPrimitive = string | number | boolean | null;
type RGXJSONObject = { [key: string]: RGXJSONValue | undefined };
type RGXJSONValue = RGXJSONPrimitive | RGXJSONValue[] | RGXJSONObject;
type RGXJSONNativeToken = Exclude<RGXNativeToken, undefined>;
type RGXJSONLiteralToken = { $rgx: true, source: string, flags?: string };
type RGXJSONClassToken = { $rgx: true, class: string, args?: RGXJSONValue[] };
type RGXJSONObjectToken = RGXJSONLiteralToken | RGXJSONClassToken;
type RGXJSONToken = RGXJSONNativeToken | RGXJSONObjectToken | RGXJSONToken[];
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXJSONObjectToken | RGXToken[];
```

# RGXClassWrapperToken
A class that wraps any `RGXToken` as an `RGXClassToken`, giving you access to the extended API class tokens provide. It delegates `rgxIsGroup` and `rgxIsRepeatable` to the wrapped token where possible.

A function `rgxClassWrapper` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

## Static Properties
- `check(value: unknown): value is RGXClassWrapperToken`: A type guard that checks if the given value is an instance of `RGXClassWrapperToken`.
- `assert(value: unknown): asserts value is RGXClassWrapperToken`: An assertion that checks if the given value is an instance of `RGXClassWrapperToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.
- `validateJSONArgs(args: RGXJSONValue[]): boolean | string`: Validates the JSON arguments `[token]`, where `token` must be a JSON token. Returns `true` when the arguments are valid, or `false`/a reason string when they are not.
- `fromJSON(json: RGXJSONClassToken): RGXClassWrapperToken`: Constructs an `RGXClassWrapperToken` from a JSON class token, wrapping the result of `rgxTokenFromJSON(token)`. Throws `RGXInvalidJSONTokenError` if `json` is not a JSON class token for `"RGXClassWrapperToken"`, and `RGXJSONClassArgsValidationFailedError` if the arguments fail `validateJSONArgs`.

## Constructor
```typescript
constructor(token: RGXToken)
```
- `token` (`RGXToken`): The token to wrap.

## Properties
- `token` (`RGXToken`): The wrapped token.

These properties only have getters.
- `rgxIsGroup` (`boolean`): Delegates to the wrapped token's group status via `isRGXGroupedToken`. Returns `true` if the wrapped token is a grouped token, otherwise `false`.
- `rgxIsRepeatable` (`boolean`): If the wrapped token is an `RGXConvertibleToken`, delegates to its `rgxIsRepeatable` property (defaulting to `true` if not present). If the wrapped token is a JSON object token, it is first converted with `rgxTokenFromJSON` and the converted token is checked instead. Otherwise, returns `true`.

## Methods
- `unwrap() => RGXToken`: Returns the original wrapped token.
- `toRgx() => RGXToken`: Returns the original wrapped token (alias for `unwrap()`).
- `clone(depth: CloneDepth = "max") => ThisType<this>`: Creates a clone of this instance to a specified depth: `0` for no clone, `1` for a shallow clone of the top-level token, any other number for that many levels down, and `"max"` (the default) for a full deep clone.
- `toJSON() => RGXJSONClassToken`: Returns a JSON class token with `class` set to `"RGXClassWrapperToken"` and `args` set to `[rgxTokenToJSON(token)]`. The result is accepted by `fromJSON` and by `rgxTokenFromJSON` (see [../../json.md](../../json.md)). Nested tokens are converted with `rgxTokenToJSON`, so plain convertible tokens inside this token are resolved into JSON literal tokens.