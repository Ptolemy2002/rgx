# Pending Breaking Changes

This is a running list of breaking changes that would improve the library but are not worth a major release by themselves. Each entry also records the workaround currently in place, so the workaround can be removed when the change is finally made.

When this list gets long, or when a change comes along that justifies a major release on its own, implement every entry here in that release, remove its workarounds, and then delete the entry.

## Entry format

Each entry has a `##` heading naming the change, followed by these sections:

- **Problem**: What is wrong with the current design.
- **Breaking change**: The change that fixes it, and what it breaks for users.
- **Current workaround**: What was done instead to avoid the major release, with the files and symbols involved.
- **Reverting the workaround**: What to remove or simplify once the breaking change is made.

---

## Give `RGXGroupToken` flags the same model as literal token flags

**Problem**: `RGXGroupToken.flags` only lists the localizable flags (`i`, `m`, `s`) to turn on, and `''` means "no modifier". A non-empty value always outputs a modifier group computed against the full `"ims"` set (`(?i-ms:...)`), so it also turns off whatever it doesn't list. The resolver handles literal tokens differently: it computes the modifier from the flags in effect where the token is inserted (`localizableVanillaRegexFlagDiff(currentFlags, token.flags)`), so it only outputs what actually changes. Because of this, a group can't represent "turn off every localizable flag". For example, `(?-i:x)` inside an `/i` pattern ends with none of `i`, `m` or `s` in effect, and `flags: ''` already means "inherit". The only way to express it today is a literal token. This blocks lossless conversion from regex source to group tokens.

**Breaking change**: Make `flags` the set of localizable flags in effect inside the group, using the same system as literal tokens, with `null` (the new default) meaning "inherit the surrounding flags". Then `''` means "turn off `i`, `m` and `s`". `toRgx(currentFlags)` computes the modifier with `localizableVanillaRegexFlagDiff` against `currentFlags`, so it only outputs a modifier when something changes. This breaks code that passes or reads `flags: ''` to mean "no modifier", and JSON group tokens serialized with `flags: ""`. Matching is unchanged for groups that set flags. They may output a shorter modifier (for example, `(?i:...)` instead of `(?i-ms:...)` when `m` and `s` are already off).

**Current workaround**: Groups that need to turn off every localizable flag can't be represented as group tokens; use a literal token with no localizable flags instead (for example, `/x/` inserted into an `/i` pattern resolves to `(?-i:x)`). `rgxParse` (`convertGroup` in `src/parse.ts`) converts such modifier groups into a concatenation of an interpolation token for the opening delimiter (such as `(?-i:`), the converted contents, and an interpolation token for `)`.

**Reverting the workaround**: In `convertGroup` in `src/parse.ts`, remove the interpolation branch, so these groups become non-capturing `RGXGroupToken`s with `flags: ''`. Remove the test for it in `test/parse.test.ts` and the bullet about it in `docs/parse.md`. Then update `RGXGroupTokenArgs`, the `flags` setter and `parseGroupJSONArgs` in `src/class/group.ts` to accept `null`, update `docs/class/token/group.md` and the type reference, and add the change to `MIGRATION.md`.

## Merge nested named groups into aliases in `rgxParse` by default

**Problem**: `rgxParse` can convert a named group whose only contents are another named group (such as `(?<a>(?<b>x))`) into a single `RGXGroupToken` with aliases, which is a closer match to what the pattern means. Since this changes the shape of the token tree `rgxParse` returns for those patterns, it is opt-in through the `mergeAliases` option, so callers have to ask for the better behavior.

**Breaking change**: Make `mergeAliases` default to `true`, so callers opt out with `mergeAliases: false` instead of opting in. The resolved pattern is the same either way, but code that walks the returned tree and expects one `RGXGroupToken` per named group (for example, reading the inner group through `tokens`) gets a single group with `aliases` instead.

**Current workaround**: `mergeAliases` defaults to `false` (the `{ mergeAliases = false }` destructuring in `rgxParse` in `src/parse.ts`).

**Reverting the workaround**: Change the default in `rgxParse` in `src/parse.ts` to `true`. Update the test in `test/parse.test.ts` that checks nested named groups stay separate without the option to pass `mergeAliases: false` instead, and pass `mergeAliases: false` in any other `test/parse.test.ts` tests that rely on nested named groups staying separate. Update the `mergeAliases` description and bullet in `docs/parse.md`, and add the change to `MIGRATION.md`.

## Remove `RGXNotDirectRegExpError`

**Problem**: `applyFlagTransformers` used to throw `RGXNotDirectRegExpError` for instances of `RegExp` subclasses (such as `ExtRegExp`), because their `flags` can include custom flags that are already applied to their source. It now converts them to plain `RegExp` instances instead, so nothing throws this error anymore, but it is still part of the public API.

**Breaking change**: Remove `RGXNotDirectRegExpError` and the `NOT_DIRECT_REGEXP` error code. This breaks code that imports the class or checks for the code.

**Current workaround**: `RGXNotDirectRegExpError` (`src/errors/notDirectRegexp.ts`) and `'NOT_DIRECT_REGEXP'` in `RGXErrorCode` (`src/errors/base.ts`) are kept, unused, and documented in `docs/class/RGXError.md` as no longer thrown.

**Reverting the workaround**: Delete `src/errors/notDirectRegexp.ts` and its export from `src/errors/index.ts`, remove `'NOT_DIRECT_REGEXP'` from `RGXErrorCode` in `src/errors/base.ts`, remove the `RGXNotDirectRegExpError` tests and import from `test/errors.test.ts`, remove its section from `docs/class/RGXError.md` (and any `RGXErrorCode` listings in `docs`), and add the change to `MIGRATION.md`.

## Serialize `ExtRegExp` literals with their original source and custom flags

**Problem**: An `ExtRegExp`'s `source` already has its custom flags' transformations applied, so `rgxTokenToJSON` stores that transformed source and only the vanilla flags, and `rgxTokenFromJSON` rebuilds it without running any transformers. Matching survives the round trip, but the record that the custom flags were applied doesn't: the deserialized `ExtRegExp`'s `flags` no longer contain them. Re-adding one of those flags afterwards applies its transformation a second time. For example, with a transformer `x` that prepends `a`, `new ExtRegExp("b", "gx")` has source `ab`, but `new ExtRegExp(rgxTokenFromJSON(rgxTokenToJSON(it)), "gx")` has source `aab`, while doing the same with the original gives `ab`.

**Breaking change**: Give `ExtRegExp` an `originalSource` property holding the pattern before any custom flag transformations (carried over when an `ExtRegExp` is constructed from another `ExtRegExp`, so it always refers to the untransformed pattern), and keep `source` as the transformed pattern, since embedding an `ExtRegExp` in a larger pattern (`src/resolve.ts`) relies on it. Then `rgxTokenToJSON` stores `originalSource` and the full flags (custom ones included) for literal tokens, and `rgxTokenFromJSON` applies the transformers exactly once when reconstructing. This breaks two things: deserializing a JSON literal token with custom flags requires those flag transformers to be registered at that point (today's JSON is self-contained), and the JSON produced for an `ExtRegExp` with custom flags changes shape (for example, `{ source: "b", flags: "gx" }` instead of `{ source: "ab", flags: "g" }`), which affects anything that compares or stores serialized output. JSON produced by older versions still deserializes the same way, since it contains no custom flags.

**Current workaround**: None; the information is dropped. `rgxTokenToJSON` in `src/json.ts` stores `token.source` with `extractVanillaRegexFlags(token.flags)`, as described in the literal token bullet of `rgxTokenToJSON` in `docs/json.md`.

**Reverting the workaround**: Add `originalSource` to `ExtRegExp` in `src/ExtRegExp.ts` (set in the constructor from the pattern, or from the pattern's own `originalSource` when it is an `ExtRegExp`) and document it in `docs/ExtRegExp.md`. In `rgxTokenToJSON` in `src/json.ts`, store `originalSource` (falling back to `source` for plain `RegExp`s) and the full `flags`, and remove the comment about dropping custom flags. Make sure `createRGXJSONLiteralToken` and the JSON literal token type guards accept custom flags (validating the source against the vanilla flags only). Update the literal token bullets of `rgxTokenToJSON` and `rgxTokenFromJSON`, and the `RGXJSONLiteralToken` description, in `docs/json.md` (and the type reference if the type's documented meaning changes), add tests in `test/json.test.ts` for the round trip and for re-adding a custom flag after it, and add the change to `MIGRATION.md`, including that custom flag transformers must be registered before deserializing.

## Remove `RGXTokenCollection`

**Problem**: `RGXTokenCollection` no longer does anything as a token that the other token types can't. A concat-mode collection resolves the same as a non-capturing `RGXGroupToken` with the same tokens, and a union-mode collection resolves the same as an `RGXClassUnionToken` or a plain array. The library already treats them as equivalent: `toRGXClassToken` converts them to those classes, and `rgxTokenToJSON` serializes them through it, so a collection doesn't survive a JSON round trip. What's left is internal: `RGXGroupToken`, `RGXClassUnionToken` and `RGXLookaroundToken` store their contents as a collection, and `RGXTokenCollectionInput` lets constructors and helpers tell union input from concat input, which checking for `RGXClassUnionToken` and `RGXGroupToken` covers. Keeping it means a second way to express the same pattern, plus mode-checking branches wherever tokens are accepted.

**Breaking change**: Remove `RGXTokenCollection`, `rgxTokenCollection`, `RGXTokenCollectionMode` and `RGXTokenCollectionInput`, and remove `RGXTokenCollection` from the `RGXToken` type. The `tokens` property of `RGXGroupToken`, `RGXClassUnionToken` and `RGXLookaroundToken` (and its subclasses) becomes a plain `RGXToken[]`, and parameters typed `RGXTokenCollectionInput` become `RGXToken`. `rgxParse` builds non-capturing `RGXGroupToken`s where it builds concat-mode collections today. This breaks code that imports any of the removed names, uses collection-only members on `tokens` (such as `mode`, `asUnion()`, `asConcat()`, or `filter`/`slice`/`splice`/`concat`/`flat` returning a collection), passes a collection where a token is accepted, or walks the token tree `rgxParse` returns and expects collections. Resolved patterns don't change.

**Current workaround**: None; `RGXTokenCollection` (`src/collection.ts`) stays as it is, along with its documentation in `docs/class/collection.md`.

**Reverting the workaround**: Delete `src/collection.ts`, its export from `src/index.ts`, `test/collection.test.ts` and `docs/class/collection.md` (and its entry in the table of contents in `README.md`). Remove `typeof RGXTokenCollection` from the convertible token types in `src/types.ts` and its branch in `src/typeGuards.ts`. In `src/class/group.ts`, `src/class/union.ts` and `src/class/lookaround.ts`, store `tokens` as an `RGXToken[]`, resolve it in `toRgx()` with `rgxConcat` (groups and lookarounds) or `resolveRGXToken(tokens, { groupWrap: false, currentFlags })` (unions), and clone it with `extClone`. In those files and in `src/class/base.ts`, `src/class/init.ts`, `src/class/exclusion.ts`, `src/class/toRGXClassToken.ts`, `src/walker/base.ts` (`createBranchGroups`), `src/json.ts` and `src/internal/assureAcceptance.ts` (`describeRGXContainer`), replace `RGXTokenCollectionInput` with `RGXToken` and remove the collection branches: union input is an array or an `RGXClassUnionToken`, and a group or lookaround keeps an `RGXClassUnionToken` as one member instead of wrapping a union-mode collection. Make `expandRgxUnionTokens` and `removeRgxUnionDuplicates` in `src/class/union.ts` return `RGXToken[]`. In `src/parse.ts`, make `sequenceToken` and the interpolation fallbacks in `convertGroup` and `convertQuantifier` return non-capturing `RGXGroupToken`s. Update the tests that construct or check for collections (in `test/class`, `test/parse.test.ts`, `test/json.test.ts`, `test/resolve.test.ts`, `test/rgx.test.ts`, `test/typeGuards.test.ts`, `test/insertionContext.test.ts` and `test/walker/base.test.ts`), update every reference in `docs` (including the `tokens` properties and constructor parameters in `docs/class/token`, and the type reference along with the type listings at the top of other docs files), and add the change to `MIGRATION.md`.
