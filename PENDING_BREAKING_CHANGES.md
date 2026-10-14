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
