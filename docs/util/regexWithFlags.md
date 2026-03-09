# Type Reference
The following is a reference to types relevant to the functions listed in this file. The full type reference for the library can be found in [type-reference.md](../type-reference.md).

```typescript
const validVanillaRegexFlagsSymbol = Symbol('rgx.ValidVanillaRegexFlags');
type ValidVanillaRegexFlagsBrandSymbol = typeof validVanillaRegexFlagsSymbol;
type ValidVanillaRegexFlags = Branded<string, [ValidVanillaRegexFlagsBrandSymbol]>;

const validRegexFlagsSymbol = Symbol('rgx.ValidRegexFlags');
type ValidRegexFlagsBrandSymbol = typeof validRegexFlagsSymbol;
type ValidRegexFlags = Branded<string, [ValidRegexFlagsBrandSymbol]> | ValidVanillaRegexFlags;
```

# regexWithFlags
```typescript
function regexWithFlags(exp: RegExp | ExtRegExp, flags: string, replace?: boolean): ExtRegExp
```
Creates a new `ExtRegExp` from an existing one with additional or replaced flags. When `replace` is `false` (the default), the provided flags are merged with the existing flags and normalized (duplicates removed). When `replace` is `true`, the existing flags are discarded and only the provided flags are used. An `RGXInvalidRegexFlagsError` will be thrown if the resulting flags are invalid.

## Parameters
  - `exp` (`RegExp | ExtRegExp`): The source regular expression.
  - `flags` (`string`): The flags to add or replace with. Must be valid regex flags, or an `RGXInvalidRegexFlagsError` will be thrown.
  - `replace` (`boolean`, optional): Whether to replace the existing flags entirely instead of merging. Defaults to `false`.

## Returns
- `ExtRegExp`: A new `ExtRegExp` with the same source pattern and the resulting flags.