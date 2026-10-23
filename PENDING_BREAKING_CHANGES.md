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

## Merge steps by default in `rgxw` when `verbatim` is `false`

### Problem

With `verbatim: false`, the literal parts of an `rgxw` template are raw regex syntax, but each one is its own walker step, matched on its own. A literal part can't open a group that a later literal part closes, even with only plain tokens between them, so ``rgxw(source, { verbatim: false })`(${"a"}|b)` `` throws `RGXInvalidWalkerStepError`. This makes the mode much less useful than the same template in `rgx`.

### Breaking change

Make `mergeSteps` default to `!verbatim` in `rgxw` (it stays `false` in `rgxwa`, which has no literal parts), so runs of steps without parts are combined by default when `verbatim` is `false`. Walkers built from balanced templates in that mode would have fewer steps, and so fewer entries in `tokens` and `captures`, a different `tokenPosition` for each part, and a different last token in `infinite` mode. Matching can change too: an alternation or quantifier in a literal part now applies to the whole run, and in non-contiguous mode a run must match in one place instead of each step searching forward separately.

### Current workaround

`mergeSteps` (in `RGXWOptions`, `src/types.ts`) defaults to `false` in `rgxwa` (`src/index.ts`), and `rgxw` passes it through unchanged, so users opt in. The merging is done by `rgxMergeWalkerSteps` in `src/internal/taggedTemplateToArray.ts`.

### Reverting the workaround

In `rgxw`, destructure `mergeSteps` and pass `mergeSteps: mergeSteps ?? !verbatim` to `rgxwa`, and update the `mergeSteps` docs in `docs/class/walker.md`, the changelog and `MIGRATION.md`.
