# Type Reference
The following is a reference to types relevant to the components listed in this file. The full type reference for the library can be found in [type-reference.md](./type-reference.md).

```typescript
type RGXPatternTransformer = (source: string, flags: string) => string;
// true for every registered transformer, false for none, a list of ids for those, or null for the enabled ones.
type RGXPatternTransformerSelection = readonly string[] | boolean | null;
```

# Pattern Transformers
Pattern transformers are rewrites applied to every finished pattern the library compiles, mainly to work around regex engine bugs. Each one receives a pattern's source and vanilla flags and returns a source that matches the same strings with the same captures, written so the engine reads it the way the specification says it should.

Transformers are registered under an id and applied in the order they were registered. Each one is enabled or disabled, and by default, every enabled transformer is applied to:
- patterns built with `rgx` and `rgxa`;
- every `ExtRegExp`, after its custom flag transformers (see [ExtRegExp.md](./ExtRegExp.md)), including ones returned by `regexWithFlags` and ones `createRegex` builds with `extended` set to `true`;
- the regex each walker step is matched with (see [walker.md](./class/walker.md));
- the regex each `"resolve"` lexeme definition is matched with, and the whitespace `skipWhitespace` skips (see [lexer.md](./class/lexer.md)).

A transformer should return the source unchanged when it has nothing to fix. It must also give the same result when applied to its own output, since a finished pattern can be placed into another pattern and finished again. Transformers apply to the whole source, so modifier groups and other syntax written by hand in literal and interpolation tokens are rewritten as much as the syntax the library generates.

Transformers are enabled when they are registered, unless registered with `enabled` set to `false`, and `setRGXPatternTransformerEnabled` turns them on and off individually. A disabled transformer can still be applied explicitly with `applyRGXPatternTransformers` or `applyRGXPatternTransformersToSource`, and an `ExtRegExp` can be given its own selection of transformers when it is constructed (see [ExtRegExp.md](./ExtRegExp.md)).

An `ExtRegExp` keeps its selection wherever it can: rebuilding it with `new ExtRegExp(regex)`, `regexWithFlags`, or the methods that create new instances through `Symbol.species` applies the same transformers, and its JSON form stores the selection when it isn't the enabled ones (see [json.md](./json.md)). Transformers that have been unregistered since are left out.

Registering, enabling or disabling a transformer only affects patterns compiled afterwards. An `ExtRegExp` keeps the transformers it was built with, so `applyRGXPatternTransformers` or `new ExtRegExp(regex, regex.flags, null)` with a new selection is needed to change them.

## Built-in Transformers
These are registered when the main entry point is imported. They work around V8 bugs with modifier groups that add or remove the `i` flag (`(?i:...)` and `(?-i:...)`), which the library generates whenever a token's case-insensitivity differs from its surroundings.

| Id | Function | What it fixes |
| --- | --- | --- |
| `"modifier-group-alternatives"` | `modifierGroupAlternativesPatternTransformer` | Without the `u` or `v` flag, a character class in any alternative but the first of a disjunction inside such a group is read with the flags outside the group, so `/(?i:a\|[b])/` doesn't match `"B"`. Each alternative gets its own modifier group instead: `(?i:a\|[b])` becomes `(?:(?i:a)\|(?i:[b]))`, and `(?i:x(?:a\|[b]))` becomes `(?:(?i:x)(?:(?i:a)\|(?i:[b])))`. |
| `"modifier-group-leaks"` | `modifierGroupLeaksPatternTransformer` | With the `u` or `v` flag, the group's modifier leaks into the character classes, property escapes, and escapes like `\w` after it, until another group is opened, so `/(?i:a)[B]/v` matches `"ab"`. An empty group, `(?:)`, is inserted after the modifier group to stop it: `(?i:a)(?:)[B]`. |

Both functions are exported, so they can be applied on their own or registered again under other ids.

# Functions
## setRGXPatternTransformerEnabled
```typescript
function setRGXPatternTransformerEnabled(id: string, enabled: boolean): void
```
Enables or disables the pattern transformer registered under the given id. Enabled transformers are the ones applied to finished patterns when nothing selects which ones to apply: patterns built with `rgx` and `rgxa`, walker steps, lexer definitions, and every `ExtRegExp` constructed from a string or plain `RegExp` without a `patternTransformers` selection. Only patterns compiled afterwards are affected. Throws `RGXInvalidPatternTransformerKeyError` if no transformer is registered under `id`.

### Parameters
  - `id` (`string`): The id of the transformer.
  - `enabled` (`boolean`): `true` to enable it, or `false` to disable it.

## isRGXPatternTransformerEnabled
```typescript
function isRGXPatternTransformerEnabled(id: string): boolean
```
Returns whether the pattern transformer registered under the given id is enabled (see `setRGXPatternTransformerEnabled`). Throws `RGXInvalidPatternTransformerKeyError` if no transformer is registered under `id`.

## registerRGXPatternTransformer
```typescript
function registerRGXPatternTransformer(id: string, transformer: RGXPatternTransformer, enabled?: boolean): void
```
Registers a pattern transformer under the given id, after every transformer already registered. Throws `RGXPatternTransformerConflictError` if a transformer is already registered under `id`.

### Parameters
  - `id` (`string`): The id to register the transformer under.
  - `transformer` (`RGXPatternTransformer`): A function that takes a pattern's source and vanilla flags and returns the transformed source.
  - `enabled` (`boolean`, optional): Whether the transformer is enabled (see `setRGXPatternTransformerEnabled`). Defaults to `true`.

### Returns
- `void`

## unregisterRGXPatternTransformer
```typescript
function unregisterRGXPatternTransformer(id: string): boolean
```
Removes the pattern transformer registered under the given id. Built-in transformers can be removed too.

### Parameters
  - `id` (`string`): The id of the transformer to remove.

### Returns
- `boolean`: `true` if a transformer was removed, or `false` if none was registered under `id`.

## hasRGXPatternTransformer
```typescript
function hasRGXPatternTransformer(id: string): boolean
```
Checks whether a pattern transformer is registered under the given id.

### Parameters
  - `id` (`string`): The id to check.

### Returns
- `boolean`: `true` if a transformer is registered under `id`, otherwise `false`.

## listRGXPatternTransformers
```typescript
function listRGXPatternTransformers(enabledOnly?: boolean): string[]
```
Lists the ids of the registered pattern transformers.

### Parameters
  - `enabledOnly` (`boolean`, optional): Whether to list only the enabled transformers. Defaults to `false`.

### Returns
- `string[]`: The ids, in the order the transformers are applied.

## registerBuiltInRGXPatternTransformers
```typescript
function registerBuiltInRGXPatternTransformers(): void
```
Registers the built-in transformers (see [Built-in Transformers](#built-in-transformers)). This is called when the main entry point is imported, so it only needs to be called again after `unregisterBuiltInRGXPatternTransformers`. Throws `RGXPatternTransformerConflictError` if any of their ids is already registered.

## unregisterBuiltInRGXPatternTransformers
```typescript
function unregisterBuiltInRGXPatternTransformers(): void
```
Removes the built-in transformers, leaving any others registered.

## applyRGXPatternTransformers
```typescript
function applyRGXPatternTransformers(regex: ExtRegExp, ids?: readonly string[] | null): ExtRegExp
function applyRGXPatternTransformers(regex: RegExp, ids?: readonly string[] | null): RegExp
```
Applies registered pattern transformers to an arbitrary regex, whether or not they are enabled, returning a new regex. An `ExtRegExp` is rebuilt from its `originalSource` with the same flags (custom ones included), and its `patternTransformers` set to the ones it already had (leaving out any that have been unregistered since) plus the ones given here, so the result is an `ExtRegExp` too. Any other regex gives a plain `RegExp` with the transformed source and the same vanilla flags. Throws `RGXInvalidPatternTransformerKeyError` if `ids` names a transformer that isn't registered, and `RGXInvalidRegexStringError` if a transformer produces an invalid regex.

### Parameters
  - `regex` (`RegExp | ExtRegExp`): The regex to transform.
  - `ids` (`readonly string[] | null`, optional): The ids of the transformers to apply. They are applied in the order they were registered, not the order given here. Defaults to `null`, which applies every registered transformer, enabled or not.

### Returns
- `RegExp | ExtRegExp`: A new `ExtRegExp` if `regex` is one, otherwise a new plain `RegExp`, with the transformed source.

## applyRGXPatternTransformersToSource
```typescript
function applyRGXPatternTransformersToSource(source: string, flags?: string, ids?: readonly string[] | null): string
```
Applies registered pattern transformers to a regex source, whether or not they are enabled. Throws `RGXInvalidPatternTransformerKeyError` if `ids` names a transformer that isn't registered, and `RGXInvalidRegexStringError` if a transformer produces a source that isn't a valid regex with `flags`.

### Parameters
  - `source` (`string`): The regex source to transform.
  - `flags` (`string`, optional): The vanilla flags the source is read with. Defaults to `''`.
  - `ids` (`readonly string[] | null`, optional): The ids of the transformers to apply, as in `applyRGXPatternTransformers`. Defaults to `null`, which applies every registered transformer.

### Returns
- `string`: The transformed source.
