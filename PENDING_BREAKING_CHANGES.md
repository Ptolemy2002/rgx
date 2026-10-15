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

**Breaking change**: Make `flags` the set of localizable flags in effect inside the group, using the same system as literal tokens, with `null` (the new default) meaning "inherit the surrounding flags". Then `''` means "turn off `i`, `m` and `s`". `toRgx()` computes the modifier with `localizableVanillaRegexFlagDiff` against the insertion flags (available through the insertion context, as `withRGXInsertionFlags` already uses them), so it only outputs a modifier when something changes. This breaks code that passes or reads `flags: ''` to mean "no modifier", and JSON group tokens serialized with `flags: ""`. Matching is unchanged for groups that set flags. They may output a shorter modifier (for example, `(?i:...)` instead of `(?i-ms:...)` when `m` and `s` are already off).

**Current workaround**: Groups that need to turn off every localizable flag can't be represented as group tokens; use a literal token with no localizable flags instead (for example, `/x/` inserted into an `/i` pattern resolves to `(?-i:x)`). `rgxParse` (`convertGroup` in `src/parse.ts`) converts such modifier groups into a concatenation of an interpolation token for the opening delimiter (such as `(?-i:`), the converted contents, and an interpolation token for `)`.

**Reverting the workaround**: In `convertGroup` in `src/parse.ts`, remove the interpolation branch, so these groups become non-capturing `RGXGroupToken`s with `flags: ''`. Remove the test for it in `test/parse.test.ts` and the bullet about it in `docs/parse.md`. Then update `RGXGroupTokenArgs`, the `flags` setter and `parseGroupJSONArgs` in `src/class/group.ts` to accept `null`, update `docs/class/token/group.md` and the type reference, and add the change to `MIGRATION.md`.
