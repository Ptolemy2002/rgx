# Type Reference
The following is a reference to types relevant to the class listed in this file. The full type reference for the library can be found in [type-reference.md](../../type-reference.md).

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
    toRgx: () => RGXToken,
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

# RGXRepeatToken
A class representing a repetition quantifier wrapping an RGX token. This allows specifying how many times a token should be matched (e.g., exactly N times, between N and M times, or unlimited). This is typically created via the `repeat()` or `optional()` methods on `RGXClassToken`, but can also be instantiated directly.

A function `rgxRepeat` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

## Static Properties
- `check(value: unknown): value is RGXRepeatToken`: A type guard that checks if the given value is an instance of `RGXRepeatToken`.
- `assert(value: unknown): asserts value is RGXRepeatToken`: An assertion that checks if the given value is an instance of `RGXRepeatToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.
- `fromJSON(json: RGXJSONClassToken): RGXRepeatToken`: Constructs an `RGXRepeatToken` from a JSON class token, passing `rgxTokenFromJSON(token)` and the remaining arguments to the constructor with the same defaults as the constructor (`min` defaults to `1`, `max` defaults to `min`, `lazy` defaults to `false`). Throws `RGXInvalidJSONTokenError` if `json` is not a JSON class token for `"RGXRepeatToken"`, and `RGXJSONClassArgsValidationFailedError` if the arguments are invalid. The JSON arguments are `[token, min?, max?, lazy?]`, where `token` must be a JSON token, `min` a number, `max` a number or `null`, and `lazy` a boolean. Nested JSON tokens only have their shape checked here, since converting them validates their contents (throwing the corresponding error).

## Constructor
```typescript
constructor(token: RGXToken, min?: number, max?: number | null, lazy?: boolean)
```
- `token` (`RGXToken`): The token to repeat. It is stored as-is; `toRgx()` decides whether its output needs a group.
- `min` (`number`, optional): The minimum number of repetitions. Must be >= 0 and <= `max` (when `max` is not `null`). Non-integer values are floored. Defaults to `1`.
- `max` (`number | null`, optional): The maximum number of repetitions. Must be >= `min` when not `null`. Non-integer values are floored. Pass `null` for unlimited repetitions. Defaults to the same as `min`.
- `lazy` (`boolean`, optional): Whether the quantifier should be non-greedy (lazy). Defaults to `false`.

## Properties
- `token` (`RGXToken`): The token being repeated, stored as-is. Setting this will throw `RGXNotSupportedError` if the value is an interpolation token, a literal token or array whose resolved source is detected as consuming no characters, or a convertible token that is not repeatable: one with `rgxIsRepeatable` set to `false`, or one without an `rgxIsRepeatable` preference whose resolved source is detected as consuming no characters (see `isRGXToken` in [type-guards.md](../../type-guards.md)). If the value is a convertible token with `rgxIsRepeatable` explicitly set to `true` that consumes no characters, it is accepted (it does no harm), but a warning is printed with `console.warn`. The warning is printed at most once per token, however many times it is repeated.
- `min` (`number`): The minimum number of repetitions. Setting this validates that the value is >= 0 and <= `max` (when `max` is not `null`), and floors non-integer values. Throws `RGXOutOfBoundsError` if validation fails.
- `max` (`number | null`): The maximum number of repetitions. Setting this validates that the value is >= `min` when not `null`, and floors non-integer values. Pass `null` for unlimited. Throws `RGXOutOfBoundsError` if validation fails.
- `lazy` (`boolean`): Whether the quantifier is non-greedy (lazy). When `true`, a `?` is appended to the `repeaterSuffix` (except when the suffix is empty, since repeating exactly once doesn't benefit from a lazy modifier). Defaults to `false`.
- `repeaterSuffix` (`string`): Returns the regex quantifier suffix based on the current `min`, `max`, and `lazy` values: `*` for `{0,}`, `+` for `{1,}`, `?` for `{0,1}`, `{n}` for exact repetitions, `{n,}` for minimum-only, `{n,m}` for a range, or an empty string for `{1,1}` (exactly once, no quantifier needed). When `lazy` is `true`, a `?` is appended to the suffix (e.g., `*?`, `+?`, `??`, `{2,5}?`), except when the suffix is empty.

## Methods
- `toRgx() => RGXToken`: Resolves the repeat token to a `RegExp` by resolving the inner token and appending the `repeaterSuffix`. Before the suffix is appended, the resolved source is checked to make sure the quantifier applies to all of it: redundant non-capturing groups are removed from it, and if it is not a singleton (exactly one character, escape, character class, or group that isn't a lookaround and doesn't only contain assertions), it is wrapped in a non-capturing group. So `new RGXRepeatToken("a", 2)` resolves to `a{2}` rather than `(?:a){2}`, while `new RGXRepeatToken("ab", 2)` resolves to `(?:ab){2}`. Returns `null` (a no-op) when both `min` and `max` are `0`.
- `clone(depth: CloneDepth = "max") => ThisType<this>`: Creates a clone of this instance to a specified depth: `0` for no clone, `1` for a shallow clone of the top-level token, any other number for that many levels down, and `"max"` (the default) for a full deep clone.
- `toJSON() => RGXJSONClassToken`: Returns a JSON class token with `class` set to `"RGXRepeatToken"` and `args` set to `[rgxTokenToJSON(token), min, max, lazy]`. The result is accepted by `fromJSON` and by `rgxTokenFromJSON` (see [../../json.md](../../json.md)). Nested tokens are converted with `rgxTokenToJSON`, so plain convertible tokens inside this token are resolved into JSON literal tokens.