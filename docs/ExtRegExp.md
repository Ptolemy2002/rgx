# Type Reference
The following is a reference to types relevant to the class listed in this file. The full type reference for the library can be found in [type-reference.md](./type-reference.md).

```typescript
const validVanillaRegexFlagsSymbol = Symbol('rgx.ValidVanillaRegexFlags');
type ValidVanillaRegexFlagsBrandSymbol = typeof validVanillaRegexFlagsSymbol;
type ValidVanillaRegexFlags = Branded<string, [ValidVanillaRegexFlagsBrandSymbol]>;

const validRegexFlagsSymbol = Symbol('rgx.ValidRegexFlags');
type ValidRegexFlagsBrandSymbol = typeof validRegexFlagsSymbol;
type ValidRegexFlags = Branded<string, [ValidRegexFlagsBrandSymbol]> | ValidVanillaRegexFlags;

type RegExpFlagTransformer = (exp: RegExp) => [string, string];
```

# ExtRegExp
A subclass of `RegExp` that supports custom flag transformers in addition to the standard vanilla regex flags (g, i, m, s, u, y). When constructed, custom flags are extracted, their corresponding transformers are applied to the pattern and vanilla flags, and the resulting transformed `RegExp` is created. The `flags` getter returns both the vanilla flags and any custom flags.

A function `extRegExp` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

## Static Properties
- `[Symbol.species]` (`RegExpConstructor`): Returns `ExtRegExp`, ensuring that derived `RegExp` methods (like those returning new regex instances) produce `ExtRegExp` instances rather than plain `RegExp`.

## Constructor
```typescript
constructor(pattern: string | RegExp, flags?: string)
```
- `pattern` (`string | RegExp`): The regex pattern. If a `RegExp` is provided, its `source` is used and its existing `flags` are tracked as already-applied flags to avoid re-applying transformers. If it is an `ExtRegExp`, its `originalSource` is carried over, and its custom flags are kept in the new instance's `flags` even when `flags` leaves them out, since their transformations are already in the source.
- `flags` (`string`, optional): The flags string, which may include both vanilla regex flags and custom registered flag keys. Validated via `assertValidRegexFlags`. Defaults to `''`.

## Properties
- `flags` (`string`): Returns the combination of the vanilla flags (from the underlying `RegExp`) and any custom flags that were applied during construction.
- `originalSource` (`string`, readonly): The pattern before any custom flag transformations were applied. `source` is the transformed pattern, which is what is used when the `ExtRegExp` is embedded in a larger pattern. `new ExtRegExp(regex.originalSource, regex.flags)` rebuilds an equivalent `ExtRegExp`, which is how JSON literal tokens store it (see [json.md](./json.md)).

# Functions
## isFlagKeyAvailable
```typescript
function isFlagKeyAvailable(flags: string): boolean
```

Checks if the given string is available for use as a custom flag transformer key. Returns `false` if the string is a vanilla regex flag or if any character in the string is already registered as a custom flag transformer.

### Parameters
  - `flags` (`string`): The string to check.

### Returns
- `boolean`: `true` if the string is available for use as a custom flag key, otherwise `false`.

## registerFlagTransformer
```typescript
function registerFlagTransformer(key: string, transformer: RegExpFlagTransformer): void
```

Registers a custom flag transformer under the given single-character key. The key must be exactly one character, must not be a vanilla regex flag, and must not already be registered. When an `ExtRegExp` is constructed with this flag character in its flags string, the transformer function will be called with the `RegExp` to transform it.

### Parameters
  - `key` (`string`): A single-character string to use as the flag key. Must not be a vanilla regex flag or an already-registered key.
  - `transformer` (`RegExpFlagTransformer`): A function that takes a `RegExp` and returns a `[source, flags]` tuple representing the transformed pattern. The returned flags must be valid vanilla regex flags; `applyFlagTransformers` will throw `RGXInvalidVanillaRegexFlagsError` if they are not, and `RGXInvalidRegexStringError` if the source is invalid regex syntax.

### Returns
- `void`: This function does not return a value, but will throw an `RGXInvalidFlagTransformerKeyError` if the key is not a single character, or an `RGXFlagTransformerConflictError` if the key conflicts with a vanilla flag or an existing transformer.

## unregisterFlagTransformer
```typescript
function unregisterFlagTransformer(key: string): void
```
Unregisters a previously registered custom flag transformer by its key. If the key was not registered, this is a no-op.

### Parameters
  - `key` (`string`): The flag key to unregister.

### Returns
- `void`: This function does not return a value.

## registerCustomFlagTransformers
```typescript
function registerCustomFlagTransformers(): void
```

Registers the library's built-in custom flag transformers (available in this file).

This function is called automatically when importing from the main module entry point, so you typically do not need to call it yourself. It only needs to be called manually if you import directly from sub-modules.

## unregisterCustomFlagTransformers
```typescript
function unregisterCustomFlagTransformers(): void
```

Unregisters all built-in custom flag transformers that were registered by `registerCustomFlagTransformers`.

## applyFlagTransformers
```typescript
function applyFlagTransformers(regex: RegExp, flags: string, alreadyAppliedFlags?: string): RegExp
```

Applies all registered flag transformers whose keys appear in the given flags string to the provided `RegExp`, returning the resulting transformed `RegExp`. Flags present in `alreadyAppliedFlags` are skipped to avoid re-applying transformers.

If `regex` is an instance of a `RegExp` subclass (i.e., `Object.getPrototypeOf(regex) !== RegExp.prototype`), such as an `ExtRegExp`, it is first converted to a plain `RegExp` with the same source and only its vanilla flags, and any custom flags in its `flags` are treated as already applied (an `ExtRegExp`'s source already has its custom flags' transformers applied). This way, transformers always receive a plain `RegExp` whose `flags` can be passed through as valid vanilla flags, and transformers are not applied twice. Each transformer is called with the current `RegExp` and must return a `[source, flags]` tuple. The returned flags are validated as vanilla regex flags before a new `RegExp` is constructed from the tuple.

### Parameters
  - `regex` (`RegExp`): The regular expression to transform. Instances of `RegExp` subclasses (such as `ExtRegExp`) are converted to plain `RegExp` instances first, as described above.
  - `flags` (`string`): The flags string containing custom flag characters to apply.
  - `alreadyAppliedFlags` (`string`, optional): A string of flag characters that have already been applied and should be skipped. Defaults to `''`.

### Returns
- `RegExp`: The transformed `RegExp` after applying all matching flag transformers. This is always a plain `RegExp`, even when `regex` is a subclass instance. If a transformer returns invalid vanilla flags, an `RGXInvalidVanillaRegexFlagsError` is thrown. If a transformer returns an invalid regex source (i.e., constructing a `RegExp` from it throws a `SyntaxError`), the error is wrapped in an `RGXInvalidRegexStringError` that identifies which flag's transformer caused the failure.

## extractCustomRegexFlags
```typescript
function extractCustomRegexFlags(flags: string): string
```

Extracts the custom (non-vanilla) flag characters from the given flags string by returning only the characters that correspond to registered flag transformers.

### Parameters
  - `flags` (`string`): The flags string to extract custom flags from.

### Returns
- `string`: A string containing only the custom flag characters found in the input.

## extractVanillaRegexFlags
```typescript
function extractVanillaRegexFlags(flags: string): string
```

Extracts the vanilla regex flag characters from the given flags string by removing all characters that correspond to registered flag transformers.

### Parameters
  - `flags` (`string`): The flags string to extract vanilla flags from.

### Returns
- `string`: A string with all registered custom flag characters removed, leaving only vanilla flags.

## normalizeVanillaRegexFlags
```typescript
function normalizeVanillaRegexFlags(flags: string): string
```

Normalizes a string of vanilla regex flags by removing duplicate flags while preserving order. First validates that all characters are valid vanilla regex flags (g, i, m, s, u, y), throwing an `RGXInvalidVanillaRegexFlagsError` if any are not, then delegates to `normalizeRegexFlags` for deduplication.

## normalizeRegexFlags
```typescript
function normalizeRegexFlags(flags: string): string
```

Normalizes a string of regex flags (including both vanilla and custom registered flags) by removing duplicate flags while preserving order. If any character in the string is not a valid regex flag (vanilla or registered custom), an `RGXInvalidRegexFlagsError` will be thrown.

# Flag Transformers
Flag transformers predefined in this library.

## accentInsensitiveFlagTransformer
A pre-built `RegExpFlagTransformer` that makes a regex pattern accent-insensitive. It parses the regex source and replaces every accentable character with a pattern matching any accented form of the same Latin letter. The accentable characters are the letters `a` to `z` and `A` to `Z` that have accented forms (every one except `q` and `Q`), and those accented forms: every character whose canonical decomposition (NFD) is the letter followed by combining marks, such as `é`, `ñ`, `ç`, `ā`, `ő`, `ę` or `ů`. The forms come from Unicode data, so no list is kept by hand.

Each accentable character is replaced with a character class of the letter and all of its precomposed forms, followed by any number of combining marks (`\p{M}*` with the `u` or `v` flag, `[\u0300-\u036f]*` without them), so text written with combining marks (such as `e` followed by U+0301) matches too. For example, `é` becomes `[eèéêëēĕėęěȅȇȩḕḗḙḛḝẹẻẽếềểễệ][\u0300-\u036f]*`. Combining marks written in the pattern right after an accentable character are removed, since the replacement already matches them. When the character is quantified, the replacement is wrapped in a non-capturing group, so the quantifier applies to all of it (`ó+` becomes `(?:[oò…]\p{M}*)+`).

Characters are replaced by value, so escapes that produce an accentable character (such as `\x61` or `\u00e9`) are covered. Characters that are part of other syntax, such as escapes (the `u` in `\u0025`), flag modifiers (the `i` in `(?i:a)`), group names (`(?<value>...)` and `\k<value>`) and property escapes (`\p{Script=Latin}`), are left as they are.

A character class can only match one character, so the combining marks can't be added to it. A class containing accentable characters is split instead, into a non-capturing group with one alternative for the class without its accentable characters (left out when nothing is left), and one replacement per letter they belong to. Ranges are split around the accentable characters they contain, with their new ends written by value. For example, `[a-cx_]` becomes `(?:[_]|[aà…]\p{M}*|[bḃ…]\p{M}*|[cç…]\p{M}*|[xẋ…]\p{M}*)` (shortened here). Only characters and ranges count: character sets such as `\w`, `\d` and `\p{L}` are kept as they are, since characters can't be removed from them without set operations.
- A negated class (such as `[^a-c]`) can't be split into alternatives, so it becomes a negative lookahead for the replacements of its letters, followed by the class as it was (such as `(?![aà…]\p{M}*|[bḃ…]\p{M}*|[cç…]\p{M}*)[^a-c]`). It matches the same characters as the class without its accentable characters, since the lookahead rules them out.
- With the `v` flag, a class using set operations (`&&` or `--`) or containing nested classes or class strings is checked against every accentable character, so the set operations are applied (and characters from sets such as `\w` inside it count too). The class without them is written with a subtraction (such as `[[[a-e]--[b]]--[acde]]`), which keeps any class strings it contains.

## beginningFlagTransformer
A pre-built `RegExpFlagTransformer` that makes a regex pattern match only at the beginning of the string. It wraps the pattern in a non-capturing group and anchors it with `^`, so that the pattern must match from the start of the string. For example, the pattern `a|b` becomes `^(?:a|b)` (the non-capturing group ensures that the anchor applies to the entire alternation, not just the first branch).

## endFlagTransformer
A pre-built `RegExpFlagTransformer` that makes a regex pattern match only at the end of the string. It wraps the pattern in a non-capturing group and anchors it with `$`, so that the pattern must match up to the end of the string. For example, the pattern `a|b` becomes `(?:a|b)$` (the non-capturing group ensures that the anchor applies to the entire alternation, not just the last branch).

## wholeFlagTransformer
A pre-built `RegExpFlagTransformer` that makes a regex pattern match the whole string. It wraps the pattern in a non-capturing group and anchors it with `^` and `$`, so that the pattern must match from the start to the end of the string. For example, the pattern `a|b` becomes `^(?:a|b)$` (the non-capturing group ensures that the anchors apply to the entire alternation, not just the first or last branch).