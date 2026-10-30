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

- **Idea**: `rgxExplain(token)` returns a tree of explanation nodes instead of text. `node.toString()` renders a default English outline (for example, "capturing group `year`: 4 digits"), and users can render the nodes themselves or define their own node classes. Walker steps, parts and walkers can be explained too.
- **Why**: It makes composed tokens easier to debug, and pairs naturally with `rgxParse` for understanding a regex written by someone else.
- **Effort**: M for tokens, plus S for parts and walkers.
- **Notes**: The design decided so far:
  - **Default nodes.** Strings, numbers and booleans say "Literally '...'". Literal tokens say "Text matching /.../". Interpolation tokens each become a "Raw regex `...`" leaf, without combining adjacent ones. Groups, repeats, lookarounds and unions become container nodes around their contents. `RGXConstantToken` uses its name, with built-in messages for the built-in constants (such as "a digit"). `RGXClassWrapperToken` and `RGXConstantToken` are transparent, so they don't use up a depth level.
  - **Arrays.** The array given to the explainer is a sequence, like the contents of a group token, and `[[a, b]]` is how a union is given. Arrays nested below that are unions, the same as in the resolver, which already treats `[[a, b]]` as the union `[a, b]` because the outer array has one branch.
  - **No-ops.** They are filtered out of sequences, but not out of unions, where `null` is an empty branch: `["a", null]` resolves to `(?:a|)`, so it means "optionally 'a'".
  - **Flags.** The flags in effect are tracked down the tree the way `resolveRGXToken` tracks `currentFlags`, since they change the meaning (for example, a string under the `i` flag ignores case). Convertible tokens are explained per position, since `toRgx(currentFlags)` can depend on the flags.
  - **Duplicates.** Union members are deduplicated with `removeRgxUnionDuplicates`, so the explanation matches the pattern that is built.
  - **Literal tokens.** An option can expand them by parsing them with `rgxParse`. For an `ExtRegExp`, its transformed `source` is parsed with only its vanilla flags (`rgxParse(ext)` throws, since `flags` includes the custom flags), with a node listing the custom flags. The transformed source includes the pattern transformers' rewrites, so it may not look like what the user wrote.
  - **Custom messages.** Convertible (and so class) tokens get a new optional member, named something like `rgxExplain(context)`, that returns a custom node. The token then becomes a wrapper node around the explanation of what `toRgx()` returns. The context carries the current flags, the remaining depth and a way to explain children with the default explainer. Interpolation tokens get the same API through an optional second argument, `rgxInterpolation(source, explanation)`, stored on the token and in its JSON form, and copied by `cloneRGXToken`. Supporting convertible tokens that return interpolation tokens instead was rejected: one that returns an unbalanced interpolation already fails to resolve, and supporting it would change the resolver's paren checks and every place that special-cases interpolation tokens.
  - **Depth.** Explainers take a maximum depth. A node cut off by it still keeps its token.
  - **Back to tokens.** Every node keeps a reference to the token it explains, and `node.toToken()` returns it. Only structural nodes (sequence, union, group, repeat, lookaround, literal, string) can be built from scratch and rebuild their token, since a custom message can't rebuild a `toRgx()` function. User-defined node classes must keep the token or provide their own `toToken()`. Nodes can be serialized to JSON by embedding `rgxTokenToJSON(token)`, using a registry keyed by node kind like `registerRGXJSONClass`. That is as lossy as the JSON of the token it embeds.
  - **No parsing the text.** The human-readable form is output only. Parsing it back would make every wording change a breaking change, would be ambiguous with user-defined nodes and custom renderers, and would preserve less than JSON.
  - **Parts.** The explainer accepts walker steps. An `RGXPart` becomes a node around its token's explanation, showing its id and which hooks are set, and `RGXPartOptions` gets the same optional explanation, since `validate` and `transform` can't be described automatically. Dynamic parts are "decided at match time" unless they have an explanation, or the caller passes a walker to produce the token from. These nodes have `toStep()`, which returns the part.
  - **Walkers.** A walker becomes a sequence of its steps' nodes, with a header for its mode: `contiguous` ("each step right after the previous one", or "anywhere after it" when off), `infinite` (repeats the last step) and `looping` (starts again from the first step). It describes the walker's setup, not what it will do on an input, since callbacks and dynamic parts depend on runtime state. It always starts from the first step, optionally marking the current one. Converting back gives the steps and options, since a walker is tied to its source. Steps combined by `mergeSteps` are explained as the original tokens, which is possible because merged steps are non-capturing group tokens recognized by `isMergedWalkerStep`.

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
