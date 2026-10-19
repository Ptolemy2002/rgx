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

## Make `accentInsensitiveFlagTransformer` cover all accents

**Problem**: `accentInsensitiveFlagTransformer` only knows a fixed list of accented variants of the five vowels (such as `é`, `è`, `ë` and `ê` for `e`). Other accented letters (such as `ñ`, `ç`, `ā` or `ő`), other accents on the vowels (such as `ę` or `ů`), and accents written as combining marks (such as `e` followed by U+0301) aren't covered. Escapes that produce an accentable character (such as `\u00e9`) and characters inside character classes (such as `[a-e]`) aren't transformed either, only characters written as themselves outside classes.

**Breaking change**: Replace each Latin letter with a class built from Unicode data instead of the fixed list: every code point whose canonical decomposition (NFD) is that letter followed by combining marks, plus the letter followed by any number of combining marks (`\p{M}*` with the `u` or `v` flag, `[\u0300-\u036f]*` without them), so decomposed text matches as well. Apply it to characters by value (so escapes are covered), and split character classes that contain accentable characters into several classes separated by pipes, inside a non-capturing group: one class for the characters that aren't accentable, and one replacement class per accentable character (ranges are split around the accentable characters they contain). For example, `[a-dx]` becomes `(?:[b-dx]|[aáàäâã…]\p{M}*)`. This is needed because a class can only match one character, so the combining-mark sequences can't be added to it directly. A negated class (such as `[^a-d]`) can't be split into alternatives, so it becomes a negative lookahead for the replacement classes followed by the class without its accentable characters (such as `(?![aáàäâã…]\p{M}*)[^b-d]`). With the `v` flag, a class using set operations (`&&` or `--`) has the operation applied to find the accentable characters it contains before it is split. This makes patterns using the flag match strings they didn't match before, and changes the transformed source.

**Current workaround**: The transformer only replaces the characters it replaced before (the `accentGroups` list in `src/flag-transformer/accentInsensitive.ts`), written as themselves outside character classes, with a character class of the same characters (`[eéèëê]`), so it matches the same strings as before.

**Reverting the workaround**: In `src/flag-transformer/accentInsensitive.ts`, replace `accentGroups` and `accentClasses` with classes built from Unicode decompositions as described above, remove the `node.raw` check, and split character classes containing accentable characters as described above (with `onCharacterClassEnter` or similar, replacing the whole class rather than its characters). Update the tests in `test/flag-transformer/accentInsensitive.test.ts` that expect escapes and character classes to be left alone, and the expected outputs of the others. Update the `accentInsensitiveFlagTransformer` section of `docs/ExtRegExp.md`, and add the change to `MIGRATION.md`.
