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
  - **Literal tokens.** An option can expand them by parsing them with `rgxParse`. For an `ExtRegExp`, its `originalSource` (from before any flag or pattern transformers ran) is parsed with only its vanilla flags (`rgxParse(ext)` throws, since `flags` includes the custom flags). Each custom flag is a function of that source and the vanilla flags, so the original plus the flags' effects describes exactly what the transformed source matches, and the pattern transformers' rewrites (which don't change what matches) stay out of the explanation.
  - **Custom flag explanations.** `registerFlagTransformer` takes an optional explanation, and the built-in `a`, `w`, `b` and `e` flags get one. Flags that have an explanation become header lines on the `ExtRegExp`'s node, rather than being expanded (the `a` flag's character classes are large, and even `w`'s `^(?:…)$` reads worse than "Matches the whole input"). Flags without one, such as a user's flags registered without an explanation, are applied to `originalSource` before parsing, by calling `applyFlagTransformers` with only those flags, so the explanation never hides an effect it can't describe. Transformers run in registration order, so applying only some of them could change the result if two of them don't commute; none of the built-in flags do, and the docs should mention it.
  - **Expand mode.** The `ExtRegExp`'s node can be switched into a mode that explains the fully transformed `source` instead. That tree is built lazily, only when the mode is used.
  - **Custom messages.** Convertible (and so class) tokens get a new optional member, named something like `rgxExplain(context)`, that returns a custom node. The token then becomes a wrapper node around the explanation of what `toRgx()` returns. The context carries the current flags, the remaining depth and a way to explain children with the default explainer. Interpolation tokens get the same API through an optional second argument, `rgxInterpolation(source, explanation)`, stored on the token and in its JSON form, and copied by `cloneRGXToken`. Supporting convertible tokens that return interpolation tokens instead was rejected: one that returns an unbalanced interpolation already fails to resolve, and supporting it would change the resolver's paren checks and every place that special-cases interpolation tokens.
  - **Depth.** Explainers take a maximum depth. A node cut off by it still keeps its token.
  - **Back to tokens.** Every node keeps a reference to the token it explains, and `node.toToken()` returns it. Only structural nodes (sequence, union, group, repeat, lookaround, literal, string) can be built from scratch and rebuild their token, since a custom message can't rebuild a `toRgx()` function. User-defined node classes must keep the token or provide their own `toToken()`. Nodes can be serialized to JSON by embedding `rgxTokenToJSON(token)`, using a registry keyed by node kind like `registerRGXJSONClass`. That is as lossy as the JSON of the token it embeds.
  - **No parsing the text.** The human-readable form is output only. Parsing it back would tie the wording to the parser, when wording changes are meant to be free to make (see [What counts as breaking](./MIGRATION.md#what-counts-as-breaking)), would be ambiguous with user-defined nodes and custom renderers, and would preserve less than JSON.
  - **Parts.** The explainer accepts walker steps. An `RGXPart` becomes a node around its token's explanation, showing its id and which hooks are set, and `RGXPartOptions` gets the same optional explanation, since `validate` and `transform` can't be described automatically. Dynamic parts are "decided at match time" unless they have an explanation, or the caller passes a walker to produce the token from. These nodes have `toStep()`, which returns the part.
  - **Walkers.** A walker becomes a sequence of its steps' nodes, with a header for its mode: `contiguous` ("each step right after the previous one", or "anywhere after it" when off), `infinite` (repeats the last step) and `looping` (starts again from the first step). It describes the walker's setup, not what it will do on an input, since callbacks and dynamic parts depend on runtime state. It always starts from the first step, optionally marking the current one. Converting back gives the steps and options, since a walker is tied to its source. Steps combined by `mergeSteps` are explained as the original tokens, which is possible because merged steps are non-capturing group tokens recognized by `isMergedWalkerStep`.

## Error messages that point at the source

- **Idea**: Include the line and column (from `rgxLexemeLocationFromIndex`) and an excerpt of the source line with a caret in match failure errors such as `RGXRegexNotMatchedAtPositionError` and the lexer's errors.
- **Why**: A bare index is hard to act on in multi-line input.
- **Effort**: S.
- **Notes**: Error message text isn't part of the API, so this isn't breaking (see [What counts as breaking](./MIGRATION.md#what-counts-as-breaking)).

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

## Let flag transformers see exact text

- **Idea**: An option on `registerFlagTransformer` (such as `{ seesExactText: true }`) that gives that transformer the pattern with its exact text still in its marker groups, instead of emptied out.
- **Why**: Exact text is hidden from every custom flag (see "Exact text" in `docs/general.md`), but a flag that only wraps the pattern or rewrites its structure could need the full source to work correctly.
- **Effort**: S.
- **Notes**: Hiding must stay the default, or custom flags would start changing exact text. A transformer that opts in has to leave the marker groups in place.

## JSON class argument descriptors

- **Idea**: An optional descriptor for each JSON class (a static on the class, or an extra argument to `registerRGXJSONClass`) that names and types its positional `args`: token, token list, number, boolean, string, enum, constant name, or an options object, each with whether it's optional, its default and a label. Built-in classes get one. From a descriptor, core can convert between named objects and positional `args`, and validate them.
- **Why**: JSON class args are positional (`RGXRepeatToken` is `[token, min, max, lazy]`), and each class checks them with a hand-written parser such as `parseRepeatJSONArgs` that returns one string for the first problem. Tools built on JSON tokens, like the planned form-based pattern builder package (a separate repo), need named fields and per-field errors without hard-coding every class's layout.
- **Effort**: M.
- **Notes**: Keep descriptors plain data, with no schema library dependency in core; a package that wants Zod can build schemas from them. Ideally the built-in `parse*JSONArgs` functions are derived from the descriptors, so there's one source of truth. The descriptor shape becomes public API once released, so settle it before shipping. A JSON Schema export is a possible follow-up. Pairs with "Path-based JSON token validation".

## Path-based JSON token validation

- **Idea**: A function such as `rgxValidateJSONToken(json)` that returns every problem in a JSON token tree as `{ path, message }[]` instead of throwing at the first one, including a final resolve to catch errors that only show up in context, such as an unbalanced interpolation.
- **Why**: The existing asserts stop at the first error and don't say where in the tree it is, which is too coarse for an editor or form that needs to mark each bad field.
- **Effort**: S to M, once "JSON class argument descriptors" exists.
- **Notes**: The existing asserts and their errors stay as they are. Paths should follow the named fields from the descriptors where a class has one, and fall back to `args` indexes otherwise.

## Integer range token

- **Idea**: A class token (something like `RGXIntegerRangeToken`) that takes inclusive `min` and `max` integers and produces a pattern matching exactly the integers in `[min, max]`, optionally with a decimal part (see the `fraction` option in the notes). The range is split into digit-aligned pieces, the way `to-regex-range` does it: for example, `[17, 243]` becomes `1[7-9]|[2-9]\d|1\d{2}|2[0-3]\d|24[0-3]`. Signed ranges are handled by taking the part of the range below zero, flipping it to positive, and emitting those branches behind a required `-`, while the non-negative branches get an optional `+`. So `[-15, 7]` becomes `-(?:[1-9]|1[0-5])|\+?[0-7]`.
- **Why**: Matching a numeric range with a regex is a common need that is tedious and error-prone to write by hand. Splitting the range keeps the pattern at about O(number of digits) branches, so it stays cheap to build and to match even for wide ranges.
- **Effort**: M.
- **Notes**:
  - Options to consider: whether leading zeros are allowed (`007`), or a fixed width with zero padding; whether `-0` is accepted; and digit-boundary guards (for example `(?<![\d+-])` and `(?!\d)`) so the token doesn't match `12` inside `123`. The guards should probably be on by default but toggleable, since a containing pattern may already provide its own boundaries.
  - Branches should be ordered so longer numbers are tried first, or wrapped so alternation order doesn't cause a shorter prefix to win when no trailing guard is used.
  - `min > max`, non-integers and non-finite bounds should throw.
  - A `fraction: { min, max }` option to allow a decimal part with a bounded number of digits. Appending `(?:\.\d{min,max})?` to every branch isn't enough, because it lets the endpoints overflow: with `[1, 5]` it would match `5.7`. Instead, the max integer gets a branch whose fraction can only be zeros (`5(?:\.0{min,max})?`), and so does the min integer when it's negative. When `min < 0`, numbers between -1 and 0 need their own `-0\.\d{min,max}` branch, since the flipped negative part starts at 1. For example, `[-15, 7]` with `fraction: { min: 1, max: 2 }` becomes `-(?:(?:[1-9]|1[0-4])(?:\.\d{1,2})?|15(?:\.0{1,2})?)|-0\.\d{1,2}|\+?(?:[0-6](?:\.\d{1,2})?|7(?:\.0{1,2})?)`. This only adds a few branches, so the pattern stays O(digits).
  - Only integer bounds belong here. Decimal bounds (like `[1.5, 3.25]`), unbounded ranges, and semantic checks (such as "a multiple of 5") stay as `RGXPart` validation on top of a generic number pattern, such as the `integer` and `decimal` constants proposed in "More built-in constants".
  - Needs a JSON form and an `rgxExplain` explanation like the other class tokens.
