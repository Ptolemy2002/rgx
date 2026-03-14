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
- `pattern` (`string | RegExp`): The regex pattern. If a `RegExp` is provided, its `source` is used and its existing `flags` are tracked as already-applied flags to avoid re-applying transformers.
- `flags` (`string`, optional): The flags string, which may include both vanilla regex flags and custom registered flag keys. Validated via `assertValidRegexFlags`. Defaults to `''`.

## Properties
- `flags` (`string`): Returns the combination of the vanilla flags (from the underlying `RegExp`) and any custom flags that were applied during construction.

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

The `regex` parameter must be a **direct** instance of `RegExp` (i.e., `Object.getPrototypeOf(regex) === RegExp.prototype`). Passing a subclass instance such as `ExtRegExp` will throw an `RGXNotDirectRegExpError`. Each transformer is called with the current `RegExp` and must return a `[source, flags]` tuple. The returned flags are validated as vanilla regex flags before a new `RegExp` is constructed from the tuple.

### Parameters
  - `regex` (`RegExp`): The regular expression to transform. Must be a direct `RegExp` instance, not a subclass; an `RGXNotDirectRegExpError` will be thrown otherwise.
  - `flags` (`string`): The flags string containing custom flag characters to apply.
  - `alreadyAppliedFlags` (`string`, optional): A string of flag characters that have already been applied and should be skipped. Defaults to `''`.

### Returns
- `RegExp`: The transformed `RegExp` after applying all matching flag transformers. If a transformer returns invalid vanilla flags, an `RGXInvalidVanillaRegexFlagsError` is thrown. If a transformer returns an invalid regex source (i.e., constructing a `RegExp` from it throws a `SyntaxError`), the error is wrapped in an `RGXInvalidRegexStringError` that identifies which flag's transformer caused the failure.

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
A pre-built `RegExpFlagTransformer` that makes a regex pattern accent-insensitive. It replaces any accentable characters (a, e, i, o, u and their uppercase equivalents) in the regex source with alternation groups that match both the base character and its accented variants. For example, `é` becomes `(e|é|è|ë|ê)`. The following accent mappings are supported:
- `a` / `A`: á, à, ä, â, ã / Á, À, Ä, Â, Ã
- `e` / `E`: é, è, ë, ê / É, È, Ë, Ê
- `i` / `I`: í, ì, ï, î / Í, Ì, Ï, Î
- `o` / `O`: ó, ò, ö, ô, õ / Ó, Ò, Ö, Ô, Õ
- `u` / `U`: ú, ù, ü, û / Ú, Ù, Ü, Û

Note that this transformer intentionally excludes replacing characters preceded by an odd number of backslashes, to allow for escaping. For example, in the pattern `\\a`, the `a` is preceded by two backslashes (an even number), so it will be replaced with `(a|á|à|ä|â|ã)`. In the pattern `\a`, the `a` is preceded by one backslash (an odd number), so it will not be replaced.

Also, characters part of a localized flag diff inline modifier (e.g., `(?i:a)`) are not replaced, as that would introduce invalid syntax. This refers to the `i` here, not the `a`, since only `i` is a localizable flag.

Finally, characters part of a character class are avoided for transformation, since that would introduce syntax errors again. For example, in the pattern `[a]`, the `a` is part of a character class and will not be replaced.

These conditions (especially the last two) may cause some patterns that should be transformed to be skipped, but that is better than having the transformer produce invalid regex patterns.

## beginningFlagTransformer
A pre-built `RegExpFlagTransformer` that makes a regex pattern match only at the beginning of the string. It wraps the pattern in a non-capturing group and anchors it with `^`, so that the pattern must match from the start of the string. For example, the pattern `a|b` becomes `^(?:a|b)` (the non-capturing group ensures that the anchor applies to the entire alternation, not just the first branch).

## endFlagTransformer
A pre-built `RegExpFlagTransformer` that makes a regex pattern match only at the end of the string. It wraps the pattern in a non-capturing group and anchors it with `$`, so that the pattern must match up to the end of the string. For example, the pattern `a|b` becomes `(?:a|b)$` (the non-capturing group ensures that the anchor applies to the entire alternation, not just the last branch).

## wholeFlagTransformer
A pre-built `RegExpFlagTransformer` that makes a regex pattern match the whole string. It wraps the pattern in a non-capturing group and anchors it with `^` and `$`, so that the pattern must match from the start to the end of the string. For example, the pattern `a|b` becomes `^(?:a|b)$` (the non-capturing group ensures that the anchors apply to the entire alternation, not just the first or last branch).