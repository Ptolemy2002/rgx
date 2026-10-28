# Pending Minor Changes

This is a running list of features and improvements that are planned but not yet started, and that can be made without breaking anything, so they can ship in any minor release. Planned changes that would break something are tracked in [PENDING_BREAKING_CHANGES.md](./PENDING_BREAKING_CHANGES.md) instead.

When an entry is implemented, delete it here and add the change to the "Unreleased" section of [CHANGELOG.md](./CHANGELOG.md).

## Entry format

Each entry has a `##` heading naming the change, followed by:

- **Idea**: What the change is.
- **Why**: The problem it solves.
- **Effort**: A rough estimate. **S** is an afternoon, **M** a few days, **L** a week or more.
- **Notes**: Design constraints, related entries, and anything that would make it breaking if done differently.

---

## Character class token

- **Idea**: An `RGXCharClassToken` for `[...]`, built from characters, ranges, escapes like `\d` and `\p{L}`, and constants, with `negate()`, `union()`, `intersect()` and `subtract()`. With the `v` flag these can produce native set operations; without it, they can fall back to lookahead subtraction, the way `RGXExclusionToken` does.
- **Why**: Character classes are the biggest construct the class token API can't represent.
- **Effort**: M to L.
- **Notes**: Making `rgxParse` return this token for classes is breaking, and is tracked in [PENDING_BREAKING_CHANGES.md](./PENDING_BREAKING_CHANGES.md#parse-character-classes-into-class-tokens-in-rgxparse-by-default). Until then, `rgxParse` should only produce it behind a `parseClasses` option.

## Possessive repeats and atomic groups

- **Idea**: A `possessive` option on `RGXRepeatToken` and an `atomic()` method on class tokens, emulated with `(?=(?<g>x*))\k<g>`, since JavaScript has neither `(?>...)` nor `x*+`.
- **Why**: They are the standard defense against catastrophic backtracking, which is easy to run into when composing tokens.
- **Effort**: M.
- **Notes**: The emulation needs a capture group, so it should use a reserved group name prefix (like `rgx_atomic_`), validated the way the walker reserves `rgx_branch_`, and left out of the walker's `capture.groups`.

## Separated list helper

- **Idea**: `rgxList(item, separator, { min, max, trailing })`, producing `item(?:separator item)*` with the bounds worked out.
- **Why**: Comma-separated lists, path segments and argument lists come up constantly, and getting `min` and `max` right by hand is fiddly.
- **Effort**: S.

## More built-in constants

- **Idea**: Constants such as `integer`, `decimal`, `identifier`, `double-quoted-string` and `single-quoted-string` (with backslash escapes, reusing `non-escape-bound`), and Unicode-aware letters such as `unicode-letter` (`\p{L}`).
- **Why**: These patterns are common, and the existing `letter` and `alphanumeric` constants are ASCII-only, which surprises people.
- **Effort**: S each.
- **Notes**: The Unicode constants can use `rgxAcceptInsertion` to reject being placed without the `u` or `v` flag. The existing ASCII constants must keep their meaning, or the change is breaking.

## Lexer mode stack

- **Idea**: `pushMode()`, `popMode()` and a current mode on `RGXLexer`, plus optional `pushMode` and `popMode` fields on lexeme definitions so a match can switch modes by itself.
- **Why**: Callers have to pass `mode` to every `consume`, which makes nested contexts (string interpolation, template literals, embedded languages) awkward to drive.
- **Effort**: M.
- **Notes**: `consume(mode?)` must keep defaulting to `"default"` when no stack is in use, or the change is breaking.

## Iterators for the lexer and walker

- **Idea**: `[Symbol.iterator]` on `RGXLexer` (yielding lexemes) and `RGXWalker` (yielding captures), plus async iterators.
- **Why**: Allows `for (const lexeme of lexer)` and lazy processing of large inputs.
- **Effort**: S.

## Lexer error recovery

- **Idea**: An opt-in mode where a position no definition matches produces an error lexeme (or skips a character) and records a diagnostic instead of throwing.
- **Why**: Syntax highlighters and linters have to keep going after bad input.
- **Effort**: M.

## Typed part ids

- **Idea**: Carry part ids through the types with a `const` type parameter on `RGXPart`, so `namedCaptures.myId` and `lastCapture("myId")` are typed instead of keyed by any string.
- **Why**: Typos in part ids are only caught at runtime today.
- **Effort**: M.
- **Notes**: The new type parameters must be added after the existing ones on `RGXPart` and `RGXWalker`, with defaults that keep today's types, or code passing explicit type arguments breaks. Typing regex group names through `rgx` templates was considered and dropped as too ambitious.

## Token tree explainer

- **Idea**: `explainRGXToken(token)` or `token.explain()`, returning an indented, human-readable outline of a token tree (for example, "capturing group `year`: 4 digits").
- **Why**: It makes composed tokens easier to debug, and pairs naturally with `rgxParse` for understanding a regex written by someone else.
- **Effort**: M.

## Error messages that point at the source

- **Idea**: Include the line and column (from `rgxLexemeLocationFromIndex`) and an excerpt of the source line with a caret in match failure errors such as `RGXRegexNotMatchedAtPositionError` and the lexer's errors.
- **Why**: A bare index is hard to act on in multi-line input.
- **Effort**: S.
- **Notes**: Error messages aren't part of the API, but anyone matching on the exact text would notice.

## Support for engines without modifier groups

- **Idea**: An opt-in mode that rewrites modifier groups away, such as `(?i:ab)` into `[aA][bB]`, `(?s:.)` into `[\s\S]` and `(?m:^)` into `(?<=^|\n)`.
- **Why**: Modifier groups are the only reason the library needs Node 23 or newer. Rewriting them would open it up to Node 22 and older browsers.
- **Effort**: L. Escapes, character classes and backreferences under `i` are the hard parts.
- **Notes**: This fits the pattern transformer system (see [docs/pattern-transformer.md](./docs/pattern-transformer.md)) as a built-in transformer registered disabled. Lowering the `engines` requirement would also mean running the tests on the older Node versions.

## CI workflow

- **Idea**: A GitHub Actions workflow that runs `typecheck` and `test:coverage` on Node 24 for every push and pull request, with a coverage threshold.
- **Why**: The repository has no CI, so regressions are only caught when someone runs the tests locally.
- **Effort**: S.

## Benchmarks

- **Idea**: A small benchmark script for the cases sped up in 15.0.0 (deeply nested resolution, nested wrappers, lexing).
- **Why**: So those speedups don't quietly regress.
- **Effort**: S to M.
