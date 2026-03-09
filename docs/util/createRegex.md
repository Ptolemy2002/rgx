# Type Reference
The following is a reference to types relevant to the function listed in this file. The full type reference for the library can be found in [type-reference.md](../type-reference.md).

```typescript
const validVanillaRegexFlagsSymbol = Symbol('rgx.ValidVanillaRegexFlags');
type ValidVanillaRegexFlagsBrandSymbol = typeof validVanillaRegexFlagsSymbol;
type ValidVanillaRegexFlags = Branded<string, [ValidVanillaRegexFlagsBrandSymbol]>;

const validRegexFlagsSymbol = Symbol('rgx.ValidRegexFlags');
type ValidRegexFlagsBrandSymbol = typeof validRegexFlagsSymbol;
type ValidRegexFlags = Branded<string, [ValidRegexFlagsBrandSymbol]> | ValidVanillaRegexFlags;
```

# createRegex
```typescript
function createRegex(pattern: string, flags?: string): RegExp
function createRegex(pattern: string, flags: string, extended: false): RegExp
function createRegex(pattern: string, flags: string, extended: true): ExtRegExp
```
Constructs a `RegExp` or `ExtRegExp` from a pattern string and optional flags, converting any `SyntaxError` thrown during construction into an `RGXInvalidRegexStringError`. When `extended` is `false` (the default), flags are validated as valid vanilla regex flags before construction, throwing `RGXInvalidVanillaRegexFlagsError` if invalid, and a plain `RegExp` is returned. When `extended` is `true`, flag validation is handled by the `ExtRegExp` constructor, which accepts both vanilla and registered custom flags, throwing `RGXInvalidRegexFlagsError` if the flags are invalid.

This function is used internally throughout the library wherever a `RegExp` or `ExtRegExp` is constructed from a string, to ensure consistent error handling.

## Parameters
  - `pattern` (`string`): The regex pattern string. If the pattern is not valid regex syntax, an `RGXInvalidRegexStringError` will be thrown.
  - `flags` (`string`, optional): The flags to apply. When `extended` is `false`, must be valid vanilla regex flags (`g`, `i`, `m`, `s`, `u`, `y`, `d`, `v`) or an `RGXInvalidVanillaRegexFlagsError` will be thrown. When `extended` is `true`, may also include registered custom flags; invalid flags throw `RGXInvalidRegexFlagsError`. Defaults to `''`.
  - `extended` (`boolean`, optional): When `true`, constructs and returns an `ExtRegExp` instead of a plain `RegExp`. Defaults to `false`.

## Returns
- `RegExp`: A plain `RegExp` when `extended` is `false` or omitted.
- `ExtRegExp`: An `ExtRegExp` when `extended` is `true`.
