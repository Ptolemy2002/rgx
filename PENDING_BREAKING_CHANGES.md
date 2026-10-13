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

## Merge JSON argument validation into JSON construction

### Problem
Validating and constructing a class from JSON are two separate steps. Registry entries have `validateArgs` and `construct` (`RGXJSONClassRegistryEntry`), and class tokens have the static `validateJSONArgs` and `fromJSON` (`RGXJSONClassTokenConstructor`). `construct` is documented to receive only validated args, but nothing enforces that: before the workaround, `getRGXJSONClass(name).construct(args)` let any caller pass invalid args to a constructor that trusts them. Because `fromJSON` is public, it also has to validate again on its own, so the registry path validated the same args twice.

### Breaking change
Make construction from JSON a single step that validates its own input. Each class would have one function (such as `fromJSON(args)`) that either returns the token or throws. Better still, the validator could return the parsed, typed args instead of a boolean ("parse, don't validate"), so the constructor receives args whose types are already known. Then:

- `RGXJSONClassRegistryEntry` becomes a single constructing function (or an entry with one member), with no separate `validateArgs`.
- `RGXJSONClassTokenConstructor` drops `validateJSONArgs`, and `RGXClassToken.validateJSONArgs` is removed.
- `validateRGXJSONClassArgs` / `assertValidRGXJSONClassArgs` are removed or reimplemented by trying to construct.
- `rgxJSONClassArgs` no longer takes a `validate` argument, or is replaced by the parser.

This breaks every custom registration made with `registerRGXJSONClass` or `registerRGXJSONClassToken`, and any code that calls `validateArgs` / `validateJSONArgs` directly.

### Current workaround
In `src/json.ts`:

- The registry stores two copies of each entry: a private copy of the entry it was given (`raw`) and a frozen `guarded` copy whose `construct` calls `assertValidRGXJSONClassArgs` before calling the raw `construct`. `registerRGXJSONClass`, `registerRGXJSONClassToken` and `getRGXJSONClass` return only the guarded copy, so code outside the module never reaches a `construct` that trusts its args. `rgxTokenFromJSON` goes through the guarded `construct`.
- To avoid validating twice, `constructValidatedRGXJSONClass` records the args array in the module-private `validatedRGXJSONClassArgs` WeakMap (keyed by the array, valued with the class name) while the raw `construct` runs. `rgxJSONClassArgs` returns early without calling `validate` when the args it receives are recorded for the same class name. That covers the built-in `fromJSON` methods and any custom `fromJSON` that uses the helper.

### Reverting the workaround
- Remove `RGXJSONClassRegistryRecord`, the raw/guarded split, `getRGXJSONClassRecord`, `constructValidatedRGXJSONClass` and `validatedRGXJSONClassArgs` from `src/json.ts`, and store the single constructing function directly.
- Remove the early return in `rgxJSONClassArgs`, or remove the helper entirely.
- Merge each built-in class' `validateJSONArgs` and `fromJSON` (in `src/class/*.ts`).
- Update `docs/json.md` (the registry section and `rgxJSONClassArgs`), `docs/class/token/base.md`, `docs/type-reference.md`, and the related tests in `test/json.test.ts`. The tests on guarded entries and single validation become unnecessary.

## Replace `rgxIsGroup` with singleton detection

### Problem
`rgxIsGroup` is named as if it means "this token is a group", but what it actually claims is that the token's output is a **singleton**: exactly one unit a quantifier can apply to as a whole (a single character, escape, character class, or group). The flag is trusted without being checked, so a token that sets it incorrectly used to make `RGXRepeatToken` produce a wrong pattern (`abc{2}` instead of `(?:abc){2}`). Whether output is a singleton can be detected from the resolved source, so the flag is unnecessary.

The flag also shapes the types: `RGXGroupedConvertibleToken` and `RGXGroupedToken` exist so `isRGXGroupedToken` can narrow on it, and `RGXRepeatToken.token` is typed `RGXGroupedToken` because its setter wraps any token that isn't flagged as grouped in a non-capturing `RGXGroupToken` when it is stored.

### Breaking change
Remove `rgxIsGroup` and decide singleton-ness from the resolved source only:

- Remove `rgxIsGroup` from `RGXConvertibleToken`, `RGXClassToken`, and every override (`RGXGroupToken`, `RGXLookaroundToken`, `RGXClassWrapperToken`), the character set constants in `src/constants.ts`, `createRGXBounds`, and the check in `isRGXConvertibleToken`.
- Remove `RGXGroupedConvertibleToken` and `RGXGroupedToken`. Replace `isRGXGroupedToken` / `assertRGXGroupedToken` with a guard such as `isRGXSingletonToken` that resolves the token and checks the result with `isSingletonRegexSource`, or remove them if nothing needs them.
- `RGXRepeatToken` stores the token it is given as-is (typed `RGXToken`), and `toRgx()` alone decides whether to group it.

This breaks custom tokens that set `rgxIsGroup`, code that uses the grouped types or guards, and code that relies on `RGXRepeatToken.token` (and the token in its `toJSON()` args) being an `RGXGroupToken` for tokens that weren't grouped.

### Current workaround
- `src/internal/scanRegexSource.ts` contains a lightweight scanner (`scanRegexSource`) that tracks group and character class structure without fully parsing, so it also works on invalid sources. `hasRegexParenErrors` (used by `resolveRGXToken` to accept interpolations with unterminated groups) and `isSingletonRegexSource` / `toSingletonRegexSource` are built on it.
- `RGXRepeatToken.toRgx()` passes the resolved source through `toSingletonRegexSource`, which wraps it in a non-capturing group if it isn't a singleton and removes non-capturing groups that only wrap a singleton. This makes the output correct even when `rgxIsGroup` is wrong, and removes the redundant group left by the setter's wrapping.
- `rgxIsGroup`, the grouped types and guards, and the setter's wrapping are all unchanged, so `RGXRepeatToken.token` still holds an `RGXGroupToken` for tokens that aren't flagged as grouped.

### Reverting the workaround
- Make the removals listed under **Breaking change**, and remove the wrapping in the `RGXRepeatToken.token` setter. Keep the `toSingletonRegexSource` call in `toRgx()`, since it now does all of the work.
- Update the `toJSON()` note in `docs/class/token/repeat.md` (the stored token is no longer wrapped), the `rgxIsGroup` mentions in `docs/class/token/base.md`, `group.md`, `wrapper.md`, `lookaround/*.md`, `docs/util/createRGXBounds.md`, and `docs/type-guards.md`, and the `RGXConvertibleToken` / grouped type listings at the top of the docs files and in `docs/type-reference.md`.
- Remove or update the tests that use `rgxIsGroup` or the grouped guards (`grep -rn "rgxIsGroup\|GroupedToken" test` lists them; most are in `test/typeGuards.test.ts`, `test/typeGuards.json.test.ts`, and `test/class/wrapper.test.ts`), and test the new guard if one is added.
