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
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXToken[];

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

## Constructor
```typescript
constructor(args?: RGXGroupTokenArgs, tokens?: RGXTokenCollectionInput)
```
- `args` (`RGXGroupTokenArgs`, optional): An object specifying the group configuration. Defaults to `{}`.
  - `name` (`string | null`, optional): The name of the group for named capture groups. Must be a valid identifier (validated via `assertValidIdentifier`). Defaults to `null`.
  - `capturing` (`boolean`, optional): Whether the group is capturing. Defaults to `true`. Setting this to `false` also clears any `name`.
  - `flags` (`string`, optional): A string of localizable regex flags (`i`, `m`, `s`) to apply to the group. Validated via `assertValidRegexLocalizableFlags`. Defaults to `''`.
- `tokens` (`RGXTokenCollectionInput`, optional): The tokens to be wrapped by the group. Internally stored as an `RGXTokenCollection` in 'concat' mode. Defaults to an empty array.

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