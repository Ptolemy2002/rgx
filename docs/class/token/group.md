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

type RGXTokenCollectionInput = RGXToken | RGXTokenCollection;

type RGXGroupTokenArgs = {
    name?: string | null;
    capturing?: boolean;
    flags?: string;
};
```

# RGXGroupToken
A class representing a group (capturing, non-capturing, or named) wrapping one or more RGX tokens. This is typically created via the `group()` method on `RGXClassToken`, but can also be instantiated directly.

A function `rgxGroup` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

## Static Properties
- `check(value: unknown): value is RGXGroupToken`: A type guard that checks if the given value is an instance of `RGXGroupToken`.
- `assert(value: unknown): asserts value is RGXGroupToken`: An assertion that checks if the given value is an instance of `RGXGroupToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.
- `validateJSONArgs(args: RGXJSONValue[]): boolean | string`: Validates the JSON arguments `[args?, tokens?]`, where `args`, if present, must be an object matching `RGXGroupTokenArgs` (`name` a string or `null`, `capturing` a boolean, `flags` a string, all optional) and `tokens`, if present, must be a JSON token (typically an array of JSON tokens). Returns `true` when the arguments are valid, or `false`/a reason string when they are not.
- `fromJSON(json: RGXJSONClassToken): RGXGroupToken`: Constructs an `RGXGroupToken` from a JSON class token, passing `args` (or `{}` when omitted) and `rgxTokenFromJSON(tokens)` (or `[]` when omitted) to the constructor. Throws `RGXInvalidJSONTokenError` if `json` is not a JSON class token for `"RGXGroupToken"`, and `RGXJSONClassArgsValidationFailedError` if the arguments fail `validateJSONArgs`.

## Constructor
```typescript
constructor(args?: RGXGroupTokenArgs, tokens?: RGXTokenCollectionInput)
```
- `args` (`RGXGroupTokenArgs`, optional): An object specifying the group configuration. Defaults to `{}`.
  - `name` (`string | null`, optional): The name of the group for named capture groups. Must be a valid identifier (validated via `assertValidIdentifier`). Defaults to `null`.
  - `capturing` (`boolean`, optional): Whether the group is capturing. Defaults to `true`. Setting this to `false` also clears any `name`.
  - `flags` (`string`, optional): A string of localizable regex flags (`i`, `m`, `s`) to apply to the group. Validated via `assertValidRegexLocalizableFlags`. Defaults to `''`.
- `tokens` (`RGXTokenCollectionInput`, optional): The tokens to be wrapped by the group. Internally stored as an `RGXTokenCollection` in 'concat' mode. Defaults to an empty array. If `tokens` is an `RGXTokenCollection` in 'union' mode, it is kept as a single element of the concat collection, so the alternation is preserved rather than its tokens being concatenated.

## Properties
- `tokens` (`RGXTokenCollection`): The internal collection of tokens managed in 'concat' mode.
- `name` (`string | null`): The name of the group. Setting this to a non-null value validates it as a valid identifier via `assertValidIdentifier`.
- `capturing` (`boolean`): Whether the group is capturing. Any named group is automatically capturing (returns `true` when `name` is not `null`). Setting this to `false` also clears `name` to `null`.
- `flags` (`string`): The localizable flags (`i`, `m`, `s`) to apply to the group. Setting this validates the value via `assertValidRegexLocalizableFlags`.

These properties only have a getter.
- `rgxIsGroup` (`true`): Returns `true` as a constant, indicating this token represents a group.
- `rgxGroupWrap` (`false`): Returns `false` as a constant, since the group already wraps itself, preventing the resolver from double-wrapping.

## Methods
- `toRgx() => RegExp`: Resolves the group by concatenating the internal tokens and wrapping the result in the appropriate group syntax: `(?<name>...)` for named groups, `(?:...)` for non-capturing groups without flags, or `(...)` for capturing groups without flags. When `flags` is non-empty, a flag-modifying wrapper is applied: non-capturing groups use `(?flags-notflags:...)` directly, while named and capturing groups are wrapped as `(?flags-notflags:(...))`. The flag diff string is computed against the full `"ims"` set — flags not present in `flags` appear after the dash.
- `clone(depth: CloneDepth = "max") => ThisType<this>`: Creates a clone of this instance to a specified depth: `0` for no clone, `1` for a shallow clone of the top-level token, any other number for that many levels down, and `"max"` (the default) for a full deep clone.
- `toJSON() => RGXJSONClassToken`: Returns a JSON class token with `class` set to `"RGXGroupToken"` and `args` set to `[{ name, capturing, flags }, tokens]`, where `capturing` is the raw capturing preference (not forced to `true` by a name) and `tokens` is the array of this group's tokens converted with `rgxTokenToJSON`. The result is accepted by `fromJSON` and by `rgxTokenFromJSON` (see [../../json.md](../../json.md)). Nested tokens are converted with `rgxTokenToJSON`, so plain convertible tokens inside this token are resolved into JSON literal tokens.