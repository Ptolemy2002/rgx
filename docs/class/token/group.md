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

type RGXTokenCollectionInput = RGXToken | RGXTokenCollection;

type RGXGroupTokenArgs = {
    name?: string | null;
    capturing?: boolean;
    flags?: string;
    aliases?: string[];
};
```

# RGXGroupToken
A class representing a group (capturing, non-capturing, or named) wrapping one or more RGX tokens. This is typically created via the `group()` method on `RGXClassToken`, but can also be instantiated directly.

A function `rgxGroup` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

## Static Properties
- `check(value: unknown): value is RGXGroupToken`: A type guard that checks if the given value is an instance of `RGXGroupToken`.
- `assert(value: unknown): asserts value is RGXGroupToken`: An assertion that checks if the given value is an instance of `RGXGroupToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.
- `fromJSON(json: RGXJSONClassToken): RGXGroupToken`: Constructs an `RGXGroupToken` from a JSON class token, passing `args` (or `{}` when omitted) and `rgxTokenFromJSON(tokens)` (or `[]` when omitted) to the constructor. Throws `RGXInvalidJSONTokenError` if `json` is not a JSON class token for `"RGXGroupToken"`, and `RGXJSONClassArgsValidationFailedError` if the arguments are invalid. The JSON arguments are `[args?, tokens?]`, where `args`, if present, must be an object matching `RGXGroupTokenArgs` (`name` a string or `null`, `capturing` a boolean, `flags` a string, `aliases` an array of strings, all optional) and `tokens`, if present, must be a JSON token (typically an array of JSON tokens). Nested JSON tokens only have their shape checked here, since converting them validates their contents (throwing the corresponding error).

## Constructor
```typescript
constructor(args?: RGXGroupTokenArgs, tokens?: RGXTokenCollectionInput)
```
- `args` (`RGXGroupTokenArgs`, optional): An object specifying the group configuration. Defaults to `{}`.
  - `name` (`string | null`, optional): The name of the group for named capture groups. Must be a valid identifier (validated via `assertValidIdentifier`). Defaults to `null`.
  - `capturing` (`boolean`, optional): Whether the group is capturing. Defaults to `true`. Setting this to `false` also clears any `name`.
  - `flags` (`string`, optional): A string of localizable regex flags (`i`, `m`, `s`) to apply to the group. Validated via `assertValidRegexLocalizableFlags`. Defaults to `''`.
  - `aliases` (`string[]`, optional): Extra names for the group, set through the `aliases` setter after `name` (so when `name` is `null`, the first alias becomes the name). Defaults to `[]`. Since `capturing` is applied afterwards, setting it to `false` drops the name and the aliases.
- `tokens` (`RGXTokenCollectionInput`, optional): The tokens to be wrapped by the group. Internally stored as an `RGXTokenCollection` in 'concat' mode. Defaults to an empty array. If `tokens` is an `RGXTokenCollection` in 'union' mode, it is kept as a single element of the concat collection, so the alternation is preserved rather than its tokens being concatenated.

## Properties
- `tokens` (`RGXTokenCollection`): The internal collection of tokens managed in 'concat' mode.
- `name` (`string | null`): The name of the group. Setting this to a non-null value validates it as a valid identifier via `assertValidIdentifier`, and throws `RGXInvalidIdentifierError` if it is one of the aliases. Setting it to `null` also clears the aliases.
- `capturing` (`boolean`): Whether the group is capturing. Any named group is automatically capturing (returns `true` when `name` is not `null`). Setting this to `false` also clears `name` to `null` (and so the aliases).
- `aliases` (`string[]`): Extra names for the group, each output as another named group nested inside the one for `name` (see `toRgx`). The getter returns a copy, so change the list by setting it or with `addAlias`. Setting it validates every name with `assertValidIdentifier` and throws `RGXInvalidIdentifierError` if any name, including `name`, appears more than once, without changing anything. When `name` is `null`, the first alias becomes `name` and the rest become the aliases, and setting an empty list does nothing. Setting `name` to `null` clears the aliases, and setting `name` to one of the aliases throws `RGXInvalidIdentifierError`.
- `flags` (`string`): The localizable flags (`i`, `m`, `s`) to apply to the group. Setting this validates the value via `assertValidRegexLocalizableFlags`.

These properties only have a getter.

## Methods
- `allNames() => string[]`: Returns the name followed by the aliases, in the order their groups appear in the output (outermost first), or an empty array when the group has no name.
- `addAlias(alias: string) => void`: Adds an alias to the end of the list, with the same validation as the `aliases` setter. When the group has no name, `alias` becomes the name instead.
- `toRgx(currentFlags?: string) => RegExp`: Resolves the group by concatenating the internal tokens and wrapping the result in the appropriate group syntax: `(?<name>...)` for named groups (with each alias as another named group nested inside, in order, such as `(?<name>(?<alias1>(?<alias2>...)))`), `(?:...)` for non-capturing groups without flags, or `(...)` for capturing groups without flags. When `flags` is non-empty, a flag-modifying wrapper is applied: non-capturing groups use `(?flags-notflags:...)` directly, while named and capturing groups are wrapped as `(?flags-notflags:(...))`, with the modifier outside any alias groups. The flag diff string is computed against the full `"ims"` set — flags not present in `flags` appear after the dash. `currentFlags` (`string`, optional, defaults to `''`) is the flags in effect where the group is placed. The internal tokens are resolved with it, with its localizable flags replaced by `flags` when `flags` is non-empty, and the returned `RegExp` carries the localizable and unicode flags of `currentFlags`, so resolving the result in that context leaves those flags alone.
- `clone(depth: CloneDepth = "max") => ThisType<this>`: Creates a clone of this instance to a specified depth: `0` for no clone, `1` for a shallow clone of the top-level token, any other number for that many levels down, and `"max"` (the default) for a full deep clone.
- `toJSON() => RGXJSONClassToken`: Returns a JSON class token with `class` set to `"RGXGroupToken"` and `args` set to `[{ name, capturing, flags, aliases? }, tokens]`, where `capturing` is the raw capturing preference (not forced to `true` by a name), `aliases` is only included when there are any, and `tokens` is the array of this group's tokens converted with `rgxTokenToJSON`. The result is accepted by `fromJSON` and by `rgxTokenFromJSON` (see [../../json.md](../../json.md)). Nested tokens are converted with `rgxTokenToJSON`, so plain convertible tokens inside this token are resolved into JSON literal tokens.