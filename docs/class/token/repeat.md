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

type RGXGroupedConvertibleToken = (RGXConvertibleToken & { readonly rgxIsGroup: true }) | (Omit<RGXConvertibleToken, "toRgx"> & { toRgx: () => RGXGroupedToken, readonly rgxGroupWrap: true  });
type RGXGroupedToken = RGXToken[] | RGXLiteralToken | RGXGroupedConvertibleToken | RGXJSONObjectToken;
```

# RGXRepeatToken
A class representing a repetition quantifier wrapping an RGX token. This allows specifying how many times a token should be matched (e.g., exactly N times, between N and M times, or unlimited). This is typically created via the `repeat()` or `optional()` methods on `RGXClassToken`, but can also be instantiated directly.

A function `rgxRepeat` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

## Static Properties
- `check(value: unknown): value is RGXRepeatToken`: A type guard that checks if the given value is an instance of `RGXRepeatToken`.
- `assert(value: unknown): asserts value is RGXRepeatToken`: An assertion that checks if the given value is an instance of `RGXRepeatToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.
- `validateJSONArgs(args: RGXJSONValue[]): boolean | string`: Validates the JSON arguments `[token, min?, max?, lazy?]`, where `token` must be a JSON token, `min` a number, `max` a number or `null`, and `lazy` a boolean. Returns `true` when the arguments are valid, or `false`/a reason string when they are not.
- `fromJSON(json: RGXJSONClassToken): RGXRepeatToken`: Constructs an `RGXRepeatToken` from a JSON class token, passing `rgxTokenFromJSON(token)` and the remaining arguments to the constructor with the same defaults as the constructor (`min` defaults to `1`, `max` defaults to `min`, `lazy` defaults to `false`). Throws `RGXInvalidJSONTokenError` if `json` is not a JSON class token for `"RGXRepeatToken"`, and `RGXJSONClassArgsValidationFailedError` if the arguments fail `validateJSONArgs`.

## Constructor
```typescript
constructor(token: RGXToken, min?: number, max?: number | null, lazy?: boolean)
```
- `token` (`RGXToken`): The token to repeat. If the token is not already a grouped token, it will be automatically wrapped in a non-capturing `RGXGroupToken`.
- `min` (`number`, optional): The minimum number of repetitions. Must be >= 0 and <= `max` (when `max` is not `null`). Non-integer values are floored. Defaults to `1`.
- `max` (`number | null`, optional): The maximum number of repetitions. Must be >= `min` when not `null`. Non-integer values are floored. Pass `null` for unlimited repetitions. Defaults to the same as `min`.
- `lazy` (`boolean`, optional): Whether the quantifier should be non-greedy (lazy). Defaults to `false`.

## Properties
- `token` (`RGXGroupedToken`): The token being repeated. Setting this will throw `RGXNotSupportedError` if the value is a convertible token with `rgxIsRepeatable` set to `false`, and will automatically wrap non-grouped tokens in a non-capturing `RGXGroupToken`.
- `min` (`number`): The minimum number of repetitions. Setting this validates that the value is >= 0 and <= `max` (when `max` is not `null`), and floors non-integer values. Throws `RGXOutOfBoundsError` if validation fails.
- `max` (`number | null`): The maximum number of repetitions. Setting this validates that the value is >= `min` when not `null`, and floors non-integer values. Pass `null` for unlimited. Throws `RGXOutOfBoundsError` if validation fails.
- `lazy` (`boolean`): Whether the quantifier is non-greedy (lazy). When `true`, a `?` is appended to the `repeaterSuffix` (except when the suffix is `?` or empty, since those cases don't benefit from a lazy modifier). Defaults to `false`.
- `repeaterSuffix` (`string`): Returns the regex quantifier suffix based on the current `min`, `max`, and `lazy` values: `*` for `{0,}`, `+` for `{1,}`, `?` for `{0,1}`, `{n}` for exact repetitions, `{n,}` for minimum-only, `{n,m}` for a range, or an empty string for `{1,1}` (exactly once, no quantifier needed). When `lazy` is `true`, a `?` is appended to the suffix (e.g., `*?`, `+?`, `{2,5}?`), except when the suffix is already `?` or empty.
- `rgxGroupWrap` (`false`): Returns `false` as a constant, since the quantifier suffix binds tightly to the preceding group and does not need additional wrapping.

## Methods
- `toRgx() => RGXToken`: Resolves the repeat token to a `RegExp` by resolving the inner token and appending the `repeaterSuffix`. Returns `null` (a no-op) when both `min` and `max` are `0`.
- `clone(depth: CloneDepth = "max") => ThisType<this>`: Creates a clone of this instance to a specified depth: `0` for no clone, `1` for a shallow clone of the top-level token, any other number for that many levels down, and `"max"` (the default) for a full deep clone.
- `toJSON() => RGXJSONClassToken`: Returns a JSON class token with `class` set to `"RGXRepeatToken"` and `args` set to `[rgxTokenToJSON(token), min, max, lazy]`. Note that `token` is the grouped token stored by this instance, so a non-grouped token given to the constructor appears as a non-capturing `RGXGroupToken` here. The result is accepted by `fromJSON` and by `rgxTokenFromJSON` (see [../../json.md](../../json.md)). Nested tokens are converted with `rgxTokenToJSON`, so plain convertible tokens inside this token are resolved into JSON literal tokens.