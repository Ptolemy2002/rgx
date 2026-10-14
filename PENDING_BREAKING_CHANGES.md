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

## Remove `rgxGroupWrap`

### Problem
`rgxGroupWrap` sets the `groupWrap` option used when resolving a convertible token's `toRgx()` result (`src/resolve.ts`), which only decides whether a literal is resolved as `(?:x)` or `x` and whether a union is resolved as `(?:a|b)` or `a|b`. Wrapping is always safe, so `false` is only ever a size optimization, and `removeRedundantRegexGroups` now removes unneeded groups at the top level of `resolveRGXToken`, in `rgxConcat`, and (with `isolated: true`) in `rgxa`. Every `rgxGroupWrap: false` in `src/constants.ts` is on a singleton such as `/./`, `/\d/` or `/[a-z]/`, `RGXRepeatToken` normalizes its operand with `toSingletonRegexSource`, and lookarounds are already groups.

The one thing `false` enables that wrapping can't is leaking an alternation into its surroundings (a token returning `/a|b/` next to `c` resolves to `a|bc`). That is a footgun, and raw output is what interpolation is for.

The flag also feeds `isRGXGroupedToken` (`rgxGroupWrap === true` and grouped content), which is part of the grouped-token machinery being replaced by singleton detection.

### Breaking change
Remove `rgxGroupWrap` from `RGXConvertibleToken`, `RGXClassToken` (and the overrides in `RGXRepeatToken` and `RGXLookaroundToken`), every constant in `src/constants.ts`, the flag transformers in `src/flag-transformer/accentInsensitive.ts`, `createRGXBounds` (`convertNoGroupWrap` and `convertToBound`), and the check in `isRGXConvertibleToken`. Convertible tokens are always resolved as if `rgxGroupWrap` were absent.

The `groupWrap` option of `resolveRGXToken` and `rgxConcat` stays: the resolver is mostly internal, and it may keep extra groups in intermediate output.

This breaks custom tokens that set `rgxGroupWrap`, code that relies on an unwrapped alternation leaking out of a token, and code that compares intermediate resolver output exactly (some of it gains groups such as `(?:\d)`, since the remover keeps groups at the edges of non-isolated sources when their last unit is an escape).

### Current workaround
None. The flag is still supported everywhere, and redundant groups it would have prevented are removed by `removeRedundantRegexGroups` regardless.

### Reverting the workaround
- Make the removals listed under **Breaking change**. In `resolveRGXToken`, a convertible token's `toRgx()` result is resolved with `groupWrap: topLevel ? groupWrap : true`.
- Serialized JSON must not gain the extra groups. `RGXClassToken.toJSON()` (`src/class/base.ts`) and `rgxTokenToJSON` (`src/json.ts`) should pass the resolved source through `removeRedundantRegexGroups` with `isolated: true` before creating the JSON literal token. This is safe because a JSON literal's source must be a valid `RegExp` on its own, and it is wrapped or flag-localized again whenever it is inserted.
- If `isRGXGroupedToken` still exists at this point, drop its `rgxGroupWrap` branch (see **Replace `rgxIsGroup` with singleton detection**, which should be done in the same release).
- Update the `RGXConvertibleToken` listings at the top of the docs files and in `docs/type-reference.md` (`grep -rln rgxGroupWrap docs`), the `rgxGroupWrap` description in `docs/class/token/base.md`, the `groupWrap`/`rgxGroupWrap` precedence paragraphs for `resolveRGXToken` in `docs/general.md`, and `docs/util/createRGXBounds.md`.
- Remove or update the tests that set `rgxGroupWrap` (`grep -rln rgxGroupWrap test`), and update expected strings that gain groups.

## Make interpolation a separate token type instead of `rgxInterpolate`

### Problem
`rgxInterpolate` is the only way to insert raw, unescaped source that may have unbalanced parentheses: native strings are escaped and literals must be valid `RegExp`s. Tagged templates depend on it (`src/internal/taggedTemplateToArray.ts` pushes non-verbatim string parts as `{ rgxInterpolate: true, toRgx }`), and `resolveRGXToken` relaxes its parenthesis validation when one is resolved.

As a flag on `RGXConvertibleToken`, though, it combines with properties that mean nothing for a source fragment. Group wrapping and singleton detection don't apply to half a group, and repeating one produces nonsense: `RGXRepeatToken` resolves `(foo` and `toSingletonRegexSource` turns it into `(?:(foo)`. Interpolation is a different kind of token, not a convertible token with an option.

### Breaking change
Replace the flag with a dedicated token type, for example a branded object `{ rgxInterpolation: string }` or a small class, with its own guard (`isRGXInterpolationToken` / `assertRGXInterpolationToken`) and an `'interpolation'` entry in `RGXTokenType`. `resolveRGXToken` handles it in its own branch, before convertible tokens. It is never repeatable (`isRGXToken(value, 'repeatable')` rejects it, so `RGXRepeatToken` throws), and it is not a convertible token.

It serializes to a new JSON token type that stores the fragment as-is, for example `{ $rgx: true, interpolation: "(foo" }` (`RGXJSONInterpolationToken`, added to `RGXJSONObjectToken`). Unlike a JSON literal's `source`, the stored string doesn't have to be a valid `RegExp`. `rgxTokenFromJSON` converts it back to an interpolation token, which is then resolved the same way interpolation tokens are. The JSON guards must tell the three JSON object forms apart (`source`, `class` and `interpolation` are mutually exclusive). Resolving it to a JSON literal, which is what happens to convertible tokens today, would fail whenever the fragment is unbalanced.

This breaks user code that creates interpolation tokens with `rgxInterpolate: true`, code that expects the string parts of a tagged template (for example, in a walker's token list) to be convertible tokens, and code that assumes every JSON object token is a literal or class token.

### Current workaround
None. `rgxInterpolate` remains a flag on `RGXConvertibleToken`.

### Reverting the workaround
- Remove `rgxInterpolate` from `RGXConvertibleToken`, `RGXClassToken`, and the check in `isRGXConvertibleToken`. Add the new type, guard and `RGXTokenType` entry, and handle it in `resolveRGXToken`, `isRGXToken`, `rgxTokenType`, `rgxTokenToJSON`, and `cloneRGXToken`.
- Add `RGXJSONInterpolationToken` to `src/types.ts`, a guard for it in `src/typeGuards.ts` (and exclude the `interpolation` key from the JSON literal and class guards), and handle it in `rgxTokenToJSON` and `rgxTokenFromJSON`.
- Make `rgxTaggedTemplateToArray` push the new token type.
- Check the walker (`src/walker`), which receives tagged template parts, handles the new type.
- Update the `RGXConvertibleToken` listings in the docs (`grep -rln rgxInterpolate docs`), the `rgxInterpolate` description in `docs/class/token/base.md`, the `resolveRGXToken` and `rgxConcat` sections of `docs/general.md`, `docs/type-guards.md`, and the JSON token types in `docs/json.md`, and document the new type (`DOCS_GUIDE.md` covers placement).
- Update the tests that use `rgxInterpolate` (`grep -rln rgxInterpolate test`) and test the new guard.

## Detect `rgxIsRepeatable` automatically when it isn't set

### Problem
`rgxIsRepeatable` defaults to `true`, so a token is only treated as non-repeatable when it says so. Every built-in token that sets it to `false` does so because its output consumes no characters (anchors, word bounds, `escape-bound`, `never`, lookarounds, `createRGXBounds` results), which can be detected from the resolved source. A custom zero-width token that forgets the flag can be repeated, which is meaningless.

### Breaking change
`rgxIsRepeatable` stays a two-state `boolean`, but its absence means "detect" instead of "repeatable":

- When present, it is trusted.
- When absent, the token is repeatable unless its resolved source is detected as consuming no characters. Detection lives in `src/internal/scanRegexSource.ts` and must err toward "consumes characters": only sources made entirely of assertions (`^`, `$`, `\b`, `\B`, and lookaround groups, plus empty groups) are non-consuming. A source that only might consume nothing, such as `a?`, is repeatable.
- When it is explicitly `true` and the source is detected as non-consuming, repeating is allowed (it's the user's choice and does no harm), but a warning is printed with `console.warn`. Print it at most once per token (for example, with a module-level `WeakSet`), since a repeated token is resolved several times.

`RGXRepeatableConvertibleToken` and the `"repeatable"` checks in `isRGXToken` change accordingly, and `RGXClassToken.rgxIsRepeatable` no longer returns `true` by default (it is absent, or `undefined`, unless a subclass sets it).

This breaks code that repeats a zero-width token without setting `rgxIsRepeatable` (it now throws `RGXNotSupportedError`), and code that reads `rgxIsRepeatable` expecting a `boolean` on every class token.

### Current workaround
None. Built-in zero-width tokens set `rgxIsRepeatable: false` explicitly, and tokens that don't set it are repeatable.

### Reverting the workaround
- Add the detection helper and use it in `isRGXToken` (`"repeatable"`), `RGXClassWrapperToken.rgxIsRepeatable`, and the `RGXRepeatToken.token` setter, which also prints the warning.
- Remove `rgxIsRepeatable: false` where detection now gives the same answer: the zero-width constants in `src/constants.ts`, `src/flag-transformer/accentInsensitive.ts` (check it is zero-width first), `createRGXBounds`, and `RGXLookaroundToken`. Keep it on anything that consumes characters but shouldn't be repeated.
- Update the `rgxIsRepeatable` descriptions in `docs/class/token/base.md` (including `repeat()` and `optional()`), `docs/type-guards.md`, and `docs/class/token/repeat.md`.
- Test the detection helper, the warning (once per token), and an explicit `true` on a zero-width token.

## Give `rgxAcceptInsertion` its real context, including for nested tokens

### Problem
`rgxAcceptInsertion(tokens, flags)` is only called by `assureAcceptance` on the tokens passed directly to `rgxa`, `rgxwa` or `rgxConcat`:

- Tokens nested in groups, lookarounds, repeats and collections are only checked when their container happens to call `rgxConcat` (concat-mode `RGXTokenCollection.toRgx()` does, union mode and the other classes don't), and then only against their local siblings, with `flags` set to `''`. `RGXGroupToken` and the lookarounds resolve their children with `this.tokens.toRgx()`, so neither the pattern's flags nor a group's own modifier flags reach them. A token that checks for a flag gets the wrong answer whenever it is nested.
- `rgxwa` always passes `''` as the flags.
- `rgxa` calls `assureAcceptance` and then calls `rgxConcat`, which calls it again, so every top-level token is checked twice.

### Breaking change
Replace the hook's arguments with a read-only context object describing where the token is placed:

```ts
type RGXInsertionContext = {
    flags: ValidRegexFlags;              // effective at this position, including modifier groups and literal tokens' flags
    siblings: readonly RGXToken[];       // what `tokens` is now
    index: number;                       // this token's position in `siblings`
    parent: RGXInsertionContext | null;  // the enclosing level
    container: RGXToken | null;          // the token whose contents this level is
};

rgxAcceptInsertion?(context: RGXInsertionContext): string | boolean;
```

Pass the context through resolution as ambient state rather than through `toRgx()`, which takes no arguments and is often implemented by calling `this.tokens.toRgx()`:

- `rgxa` (and `rgxwa`) push a root frame on a module-level stack. Resolution is synchronous, so the stack can't leak between calls.
- `rgxConcat` and `RGXTokenCollection.toRgx()` read the current frame, call each token's hook with a context built from it, and push a child frame while resolving each token. `RGXGroupToken` adds its modifier flags to the frame it pushes.
- Acceptance is only checked while a pattern is being built, that is, under a root frame. A standalone `resolveRGXToken`, `toJSON()`, or a repeat's singleton check never runs the hook, and each placement is checked exactly once.

A whole-pattern view (for example, checking that a named group exists anywhere) is out of scope, since opaque convertible tokens can't be inspected structurally. If it is ever needed, add a separate hook that runs on the final source.

This breaks every custom `rgxAcceptInsertion` implementation (new signature), and patterns that build today can start throwing `RGXInsertionRejectedError` once nested tokens are checked with their real flags. None of the built-in classes override the hook.

### Current workaround
None. `assureAcceptance` (`src/internal/assureAcceptance.ts`) is unchanged.

### Reverting the workaround
- Implement the context stack and replace `assureAcceptance`, removing the duplicate call in `rgxa` and the `''` flags in `rgxwa` (`src/index.ts`).
- Change the signature in `RGXConvertibleToken`, `RGXClassToken`, and the return-value check in `isRGXConvertibleToken` (which currently calls the hook with `([], '')`; call it with a minimal context, or only check callability).
- Make `RGXInsertionRejectedError` report the location from the context (the path through `parent`, not only the top-level index).
- Update the `rgxAcceptInsertion` descriptions in `docs/class/token/base.md` and `docs/general.md` (`rgx`, `rgxa`, `rgxConcat`), and the `RGXConvertibleToken` listings at the top of the docs files and in `docs/type-reference.md`.
- Update the tests that define `rgxAcceptInsertion` (`grep -rln rgxAcceptInsertion test`), and test nested rejection, modifier group flags, and that each placement is checked once.
