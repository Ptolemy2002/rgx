# Changelog

This file lists the changes in each released version of RGX, starting with 10.0.0, when the library was announced publicly. Dates are the dates each version was published to npm. Versions are listed newest first.

For step-by-step instructions on upgrading across major versions, see [MIGRATION.md](./MIGRATION.md). Breaking changes that are planned but not yet released are tracked in [PENDING_BREAKING_CHANGES.md](./PENDING_BREAKING_CHANGES.md).

Changes to the exact regex source the library outputs aren't considered breaking on their own, as long as the pattern matches the same strings with the same captures (see [What counts as breaking](./MIGRATION.md#what-counts-as-breaking)).

---

## Unreleased

These changes are on `main` but haven't been published to npm yet. `package.json` was bumped to 14.3.0, but that version was never published, so its changes ship with the next release, which will be a major version (15.0.0).

### Breaking

See [MIGRATION.md](./MIGRATION.md#1500) for details and update instructions.

- `RGXTokenCollection` and its helpers (`rgxTokenCollection`, `RGXTokenCollectionMode`, `RGXTokenCollectionInput`) are removed. The `tokens` of groups, unions and lookarounds is a plain `RGXToken[]`, and `rgxParse` returns non-capturing `RGXGroupToken`s where it returned concat-mode collections.
- `RGXGroupToken.flags` is now the set of localizable flags in effect inside the group, and defaults to `null`, which inherits the surrounding flags. `flags: ''` now turns `i`, `m` and `s` off.
- Backreferences are validated in finished patterns and walker steps, and invalid ones throw `RGXInvalidBackreferenceError`. Duplicate group names that only meet in the finished pattern throw `RGXDuplicateGroupNameError`.
- Walker steps are checked when the walker is created (`RGXInvalidWalkerStepError`), group names starting with `rgx_branch_` are reserved (`RGXReservedGroupNameError`), and `RGXLexer` validates its lexeme definitions when it is created.
- `RGXPart.token` can be a function of the walker's state, so it's typed `RGXPartToken` instead of `RGXToken`. Use `part.resolveToken(walker)` to get the token.
- Walker steps can be unions of parts. Nested unions are flattened, so `capture.branch` counts the flattened union, the walker's internal `rgx_branch_*` groups are left out of `capture.groups` (your own named groups are kept), and steps are typed `RGXWalkerStep`.
- `rgxParse` merges nested named groups into aliases by default (`mergeAliases: true`).
- `ExtRegExp` has an `originalSource` property. JSON for `ExtRegExp` literals stores the original source and custom flags, and building an `ExtRegExp` from another one (or calling `regexWithFlags` on one) rebuilds it from its original source, so custom flags can be removed.
- The accent-insensitive flag covers every Latin letter with accented forms, including escapes, combining marks, character classes and character sets such as `\w`. Use `setAccentInsensitiveSetExpansion(false)` to leave character sets alone.
- `RGXNotDirectRegExpError` and the `NOT_DIRECT_REGEXP` error code are removed.
- `rgxConstant` returns an `RGXConstantToken` that refers to the constant by name, instead of the token the constant is stored as. Use `rgxConstantValue` for the stored token. Defining a constant as a reference to itself throws `RGXConstantConflictError`.
- `RGXLexer` resolves each `"resolve"` definition once, when it is created, instead of every time the definition is tried, so changes made to a token afterwards are ignored. Pass `{ resolveOnce: false }` as the new fourth constructor argument for the old behavior. Lexing is several times faster (560 lexemes went from about 114ms to 16ms in a benchmark).

### Added

- `applyFlagTransformers` accepts instances of `RegExp` subclasses, converting them into plain `RegExp`s.
- Dynamic parts, whose token is produced from the walker's state each time they're captured (`part.isDynamic()`, `part.resolveToken(walker)`).
- Walker steps that are unions of parts and tokens, nested to any depth.
- `validateRGXLexemeDefinition`.
- `RGXConstantToken`, a reference to a constant by name that keeps the link through JSON, with an option to cache the looked-up token.
- `rgxConstantValue`, which returns the token a constant is stored as.
- `deleteRGXConstant` returns the deleted token.
- Documentation for the walker's `snapshot()` and `restore()` methods and their types.
- `RGXWalker.branchErrors`, which records the validation errors of union branches that were dropped so another branch could capture, along with the failed capture and the step's position (`RGXWalkerBranchError`). Before, these errors were discarded.

### Fixed

- `accentInsensitiveFlagTransformer` parses the pattern instead of scanning it with lookbehinds, so it no longer replaces letters that are part of other syntax, such as group names (`(?<value>...)`, `\k<value>`), property escapes (`\p{Script=Latin}`) and escapes like `\u0025`.
- A walker snapshot can be restored more than once, since its values are cloned on restore.
- `RGXClassToken.clone()` keeps the `validate` setting of parts.
- `RGXClassWrapperToken` passes `rgxAcceptInsertion` to the wrapped token, so the wrapped token can reject the wrapper's placement instead of only being checked at its own placement inside the wrapper. The wrapped token is checked once, at the wrapper's placement.
- The token an `RGXConstantToken` refers to is checked for insertion once, at the reference's placement, instead of a second time inside the reference.
- Resolving a convertible token calls its `toRgx()` once instead of twice (once was only to check the return value). Since this doubled the work at every level of nesting, resolving deeply nested class tokens is much faster (6 levels of `rgxRepeat(rgxGroup(...))` went from about 110ms to under 1ms). An invalid return value still throws `RGXInvalidTokenError`.
- `RGXWalker.clone()` clones the tokens, `reduced`, `share` and `captures` instead of sharing them with the original walker.
- `RGXWalker` resolves a step that isn't a union once instead of twice, reusing the source it already resolved to check the step.
- `isRGXConvertibleToken` no longer reads the `rgxIsRepeatable` getter of class tokens, and reads it once for other tokens. An `RGXClassWrapperToken` (or a constant reference to one) computes it by resolving the wrapped token, so every check of a wrapper resolved its token twice, and nested wrappers took exponential time (6 levels went from about 490ms to under 1ms).
- `RGXClassWrapperToken`, `toRGXClassToken` and `isRGXSingletonToken` (with JSON tokens accepted) no longer call `toRgx()` just to check a token they resolve anyway. An invalid token still fails when it's resolved.

---

## 14.2.0 - 2026-10-17

### Added

- `RGXGroupToken` supports aliases: extra names for the same group.
- `rgxParse` has a `mergeAliases` option, which merges a named group whose only contents are another named group into one group with an alias. It's off by default, and making it the default is a pending breaking change.
- `rgxParse` accepts an options object in place of flags.

### Changed

- `rgxParse` drops quantifiers on assertions when the quantifier requires at least one repetition, since repeating an assertion has no effect.

## 14.1.0 - 2026-10-15

### Added

- `rgxParse`, which converts a regex (or regex source) into a tree of RGX tokens.

### Changed

- Regex sources are analyzed with the [`@eslint-community/regexpp`](https://github.com/eslint-community/regexpp) parser instead of a hand-written tokenizer.
- `isValidRegexString` checks regex strings with their flags, so syntax that's only valid under certain flags (such as `u` or `v`) is checked correctly.
- Class tokens keep track of the flags in effect inside them.

### Fixed

- Lazy optional repeats resolve correctly.
- `asLookahead()` and `asLookbehind()` reverse lookarounds correctly.
- Escaping and validity checks under the `u` and `v` flags.

## 14.0.0 - 2026-10-15

### Breaking

See [MIGRATION.md](./MIGRATION.md#1400) for details and update instructions.

- `rgxIsGroup` is removed, along with `RGXGroupedToken`, `RGXGroupedConvertibleToken`, `isRGXGroupedToken` and `assertRGXGroupedToken`. The library detects whether a token's output is a single unit itself. Use `isRGXSingletonToken` and `assertRGXSingletonToken` instead.
- `RGXRepeatToken` stores the token it's given as-is, instead of wrapping it in a non-capturing group.
- `rgxGroupWrap` is removed. Convertible tokens are wrapped in a non-capturing group when needed, and unnecessary groups are removed from the final pattern.
- Interpolation is its own token type, `RGXInterpolationToken` (`{ rgxInterpolation: string }`, created with `rgxInterpolation()`), instead of the `rgxInterpolate` property. It has its own `RGXTokenType` (`'interpolation'`), type guards and JSON form, and is never repeatable.
- When `rgxIsRepeatable` isn't set, it's detected: tokens that consume no characters (assertions and lookarounds) aren't repeatable. `RGXClassToken.rgxIsRepeatable` is `undefined` by default.
- `rgxAcceptInsertion` receives an `RGXInsertionContext` instead of `(tokens, flags)`, and is called for every placement at any depth with the flags in effect there. `RGXInsertionRejectedError` has a `context` property.
- JSON class construction is a single step. `registerRGXJSONClass` takes a constructor function, `rgxJSONClassArgs` takes a parser, and `RGXJSONClassRegistryEntry`, `RGXJSONClassArgsValidator`, `validateRGXJSONClassArgs`, `assertValidRGXJSONClassArgs`, `RGXClassToken.validateJSONArgs`, `RGXJSONClassTokenConstructor` and `validateLookaroundJSONArgs` are removed.

### Added

- `MIGRATION.md`, a guide to upgrading across major versions.

### Fixed

- Cloning an `RGXRepeatToken` keeps its `lazy` setting.

## 13.12.1 - 2026-10-14

### Changed

- Block constants (such as `"non-newline-whitespace-block"`) are built with `rgxRepeat` instead of being literal tokens, so their repeat can be manipulated directly.

## 13.12.0 - 2026-10-13

### Changed

- `RGXRepeatToken` makes sure its quantifier applies to the whole resolved source. Sources that aren't a single unit are wrapped in a group even if their `rgxIsGroup` was wrong, and groups that only wrap a single unit are removed (`a{2}` instead of `(?:a){2}`).
- Redundant non-capturing groups are removed from resolved patterns.
- The minimum Node version (23) is declared in `engines`, since the library generates modifier groups like `(?i:...)`.

### Fixed

- Character classes are only treated as nested when the `v` flag is set while checking for unbalanced parentheses.

## 13.11.2 - 2026-10-08

### Fixed

- Union-mode collections passed to group and lookaround tokens are kept as unions instead of being concatenated.

## 13.11.1 - 2026-10-08

### Fixed

- `typesync` runs in `prepare` instead of `postinstall`, so it no longer runs when the package is installed as a dependency.

## 13.11.0 - 2026-10-08

### Changed

- `registerRGXJSONClass` and `getRGXJSONClass` return a frozen, guarded entry whose `construct` always validates its args first, so registered constructors can't be called with unvalidated args.
- Converting class tokens from JSON validates their args once instead of twice.
- Updated the internal `@ptolemy2002/ts-utils` dependency to version 4.

### Added

- `PENDING_BREAKING_CHANGES.md`, a list of breaking changes planned for the next major release.

## 13.10.0 - 2026-10-07

### Added

- Class tokens are JSON-serializable by default. The default `toJSON()` stores the token's resolved pattern as a literal, which keeps its matching behavior but not its class-specific data.

## 13.9.0 - 2026-10-05

### Added

- JSON serialization for tokens (`rgxTokenToJSON`, `rgxTokenFromJSON`, and the `'json'` token type), so tokens can be stored or sent over the network. Class tokens can be registered with a JSON class registry to round-trip with their own data.
- `RGXInvalidJSONTokenError`, `RGXInvalidJSONClassKeyError`, `RGXJSONClassConflictError`, `RGXJSONClassArgsValidationFailedError` and `RGXNotJSONSerializableError`.

## 13.8.0 - 2026-05-27

### Added

- `cast` variants of the type guards for branded types, such as `castValidRegexString`, `castValidVanillaRegexFlags`, `castValidIdentifier`, `castValidRegexLocalizableFlags` and `castValidRegexLocalizableFlagDiff`.

## 13.7.0 - 2026-05-06

### Added

- Asynchronous walker methods (`stepToTokenAsync`, `stepToPartAsync`, `walkAsync` and `tryWalkAsync`), which yield to the event loop between steps.

## 13.6.0 - 2026-05-01

### Added

- An `inner` option for `createRGXBounds`. When `false`, the bounds only assert the `negative` pattern, without the inward-facing assertion on the `positive` pattern.

## 13.5.0 - 2026-04-19

### Added

- `RGXGroupToken` supports inline flag modifiers directly, so a `RegExp` literal is no longer needed to apply local flags.
- The `ValidRegexLocalizableFlags` and `ValidRegexLocalizableFlagDiff` branded types, with their type guards and errors.

## 13.4.0 - 2026-04-16

### Changed

- The walker uses a snapshot system to save and revert its state, instead of storing and restoring each value by hand.

## 13.3.4 - 2026-04-04

### Fixed

- Unbalanced parentheses are detected without relying on the text of the engine's error message, so the check works on every platform.

## 13.3.3 - 2026-04-04

### Fixed

- Parts whose value type (`T`) isn't `unknown`, such as `RGXPart<R, S, number>`, can be passed to a walker without a type error. The default for `T` in `RGXTokenOrPart` changed from `unknown` to `any`. This only affects types, and a part's `R` and `S` still have to match the walker's.

## 13.3.2 - 2026-03-31

### Changed

- Interpolation tokens can also close a group that an earlier token opened, so a token like `)` with no matching `(` of its own is accepted. 13.3.1 only allowed the opening half.

## 13.3.1 - 2026-03-31

### Changed

- Interpolation tokens can open a group without closing it (such as `(?<word>`), with the expectation that a later token closes it. Before, the resolver rejected each token's source on its own if its parentheses weren't balanced.

## 13.3.0 - 2026-03-31

### Added

- The `"never"` constant, a pattern that never matches (`(?!)`).

## 13.2.1 - 2026-03-30

### Changed

- Internal cleanup with no effect on behavior.

## 13.2.0 - 2026-03-30

### Added

- `RGXExclusionToken`, which matches a pattern as long as the match isn't one of a list of specific alternatives.
- A `createRGXBounds` option that sets both `anchorStart` and `anchorEnd` at once.

## 13.1.0 - 2026-03-29

### Added

- `createRGXBounds` takes an options object, with `anchorStart` and `anchorEnd` options to let the bounds match at the start and end of the string. Passing a string still sets the flags.

## 13.0.2 - 2026-03-29

### Changed

- `createRGXBounds` takes a `positive` pattern (the region being bounded) and a `negative` pattern (what flanks it), instead of `before` and `after`.

## 13.0.1 - 2026-03-29

### Fixed

- An incorrect `rgxIsGroup` value on one of the constants.

## 13.0.0 - 2026-03-29

### Breaking

See [MIGRATION.md](./MIGRATION.md#1300) for details and update instructions.

- `resolveRGXToken` takes an options object (`ResolveRGXTokenOptions`) instead of separate parameters.
- `rgxConstant` always returns an `RGXClassToken`. Constants defined as plain tokens are wrapped in an `RGXClassWrapperToken`.
- The `"word-bound-start"` and `"word-bound-end"` constants match at the start and end of the string.

### Added

- `createRGXBounds`, for building start and end bounds from custom patterns.
- The `"non-newline-whitespace"` and `"non-newline-whitespace-block"` constants.

## 12.8.0 - 2026-03-24

### Added

- Options for `tryWalk` (`RGXTryWalkOptions`) to revert more state than it does by default when a walk fails.

## 12.7.4 - 2026-03-24

### Fixed

- Returning `"skip"` in non-contiguous mode no longer advances the walker too far.

## 12.7.3 - 2026-03-23

### Changed

- `RGXWalker.currentToken()` throws `RGXCurrentTokenNotFoundError` instead of returning `null` when there is no current token, since a token can itself be `null`.

### Added

- `RGXWalker.atLastToken()`.

### Fixed

- A couple of walker bugs, including the last group of a capture being skipped.

## 12.7.2 - 2026-03-22

### Fixed

- Cloning a walker keeps its `contiguous` setting.
- The accent-insensitive flag recognizes flag modifiers that turn some flags on and others off (such as `(?m-s:`), so it doesn't treat them as accentable text.

## 12.7.1 - 2026-03-22

12.7.0 was never published, so this is the first release with its changes.

### Added

- A non-contiguous mode for walkers, where each step can match after the current position instead of exactly at it.
- `regexMatchAfterPosition`, `doesRegexMatchAfterPosition`, `assertRegexMatchesAfterPosition` and `RGXRegexNotMatchedAfterPositionError`.

### Fixed

- Infinite mode combined with non-contiguous mode.

## 12.6.0 - 2026-03-20

### Added

- `afterCapture` can return part control values to control the walker, which reverts the capture when needed.

## 12.5.0 - 2026-03-20

### Added

- An `.mjs` entry point for better ES module interop.

## 12.4.0 - 2026-03-14

### Added

- `tryWalk`, which walks and reverts the walker's state if the walk fails.
- The `w`, `b` and `e` custom flags (`wholeFlagTransformer`, `beginningFlagTransformer` and `endFlagTransformer`), which make a pattern match the whole string, the beginning of the string or the end of the string.

### Changed

- Peer dependencies are regular dependencies.

## 12.3.0 - 2026-03-14

### Added

- The `"escape-bound"` constant, which matches a position preceded by an odd number of backslashes.

### Changed

- The `"non-escape-bound"` constant also matches when the next character is a backslash.

## 12.2.0 - 2026-03-11

### Added

- The `rgxInterpolate` property on class tokens.

### Changed

- Calling `optional()` on an `RGXRepeatToken` reuses it where possible: a token with `min` of `0` is returned as-is, and one with `min` of `1` gets `min` set to `0`, instead of always being wrapped in another repeat.

## 12.1.0 - 2026-03-11

### Changed

- Tagged templates read their string parts raw (`strings.raw`), so backslash sequences reach the pattern exactly as written.

## 12.0.0 - 2026-03-10

### Breaking

See [MIGRATION.md](./MIGRATION.md#1200) for details and update instructions.

- `rgx` takes an options object (`{ multiline, verbatim }`) instead of separate parameters, matching `rgxw`.

## 11.1.1 - 2026-03-09

### Changed

- `null` and `undefined` interpolations in tagged templates are kept as no-op tokens instead of being dropped.

## 11.1.0 - 2026-03-09

### Added

- `afterFailure` and `afterValidationFailure` can return part control values, so a part can recover from a failure.

## 11.0.0 - 2026-03-09

### Breaking

See [MIGRATION.md](./MIGRATION.md#1100) for details and update instructions.

- Part callbacks receive a single `RGXPartContext` (with `part` and `walker`) instead of separate parameters.
- `walk()` returns the walker's reduced value instead of the walker itself.
- Flag transformers return a source and flags instead of a `RegExp`.

### Added

- `createRegex`, and the `ValidVanillaRegexFlags` and `ValidRegexFlags` branded types.
- `RGXNotDirectRegExpError`, thrown when a flag transformer receives a `RegExp` subclass instance.

## 10.0.0 - 2026-03-06

The first publicly announced version.

### Breaking

- Validation is stricter: invalid flags and invalid resolved patterns throw `RGXError`s.

### Added

- Interpolation: a convertible token can be inserted into the pattern as-is instead of being escaped.
- A `verbatim` option for tagged templates. With `verbatim: false`, the literal text of the template is interpolated instead of escaped, so the resolver no longer guarantees a valid pattern on its own.
