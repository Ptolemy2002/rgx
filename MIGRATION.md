# Migration Guide

This guide covers the breaking changes in the major versions of RGX released since March 2026. Some major versions aren't listed because their changes are small or explain themselves. Each section lists what changed and how to update your code.

If you're upgrading across several major versions, apply the sections in order, oldest first.

## What counts as breaking

A change is breaking if it changes what a pattern matches, or changes the public API (names, signatures, types, or documented behavior other than exact output). Changes to the exact regex source the library outputs are not breaking on their own, as long as the pattern matches the same strings with the same captures. For example, a minor or patch release may remove a redundant group, shorten a flag modifier, or reorder equivalent syntax. Don't compare resolved sources as strings to check whether two patterns are equivalent, and don't depend on the exact text of a resolved pattern. Test what it matches instead.

| Version | Main changes |
| --- | --- |
| [15.0.0](#1500) | `RGXTokenCollection` removed, group flags inherit by default, backreferences and walker steps are validated, part tokens can be functions, walker steps can be unions of parts, `rgxParse` merges aliases by default, `ExtRegExp` JSON keeps custom flags, the accent-insensitive flag covers all accents, `RGXNotDirectRegExpError` removed |
| [14.0.0](#1400) | `rgxIsGroup`, `rgxGroupWrap` and `rgxInterpolate` removed, repeatability detected automatically, new `rgxAcceptInsertion` signature, single-step JSON class construction |
| [13.0.0](#1300) | `resolveRGXToken` takes an options object, `rgxConstant` always returns a class token, word bounds match at the edges of the string |
| [12.0.0](#1200) | `rgx` takes an options object |
| [11.0.0](#1100) | Part callbacks take a context object, `walk()` returns the reduced value, flag transformers return a source and flags |
| [9.0.0](#900) | `share` generic added to walkers and parts |
| [8.0.0](#800) | Walkers and parts are no longer tokens |
| [7.0.0](#700) | `namedCaptures` stores arrays |

Version 10.0.0 isn't covered. It made validation stricter (invalid flags and invalid resolved patterns now throw `RGXError`s) and added interpolation, which 14.0.0 then reworked.

---

# 15.0.0

## `RGXTokenCollection` is removed

`RGXTokenCollection` did nothing a group or union token couldn't do: a concat-mode collection resolved the same as a non-capturing `RGXGroupToken`, and a union-mode collection the same as an array or an `RGXClassUnionToken`.

Removed:

- `RGXTokenCollection`, `rgxTokenCollection`, `RGXTokenCollectionMode` and `RGXTokenCollectionInput`.
- `RGXTokenCollection` as an input to `isRGXToken`, `assertRGXToken` and `rgxTokenTypeGuardInputToFlat`.

Changed:

- The `tokens` property of `RGXGroupToken`, `RGXClassUnionToken`, `RGXLookaroundToken`, `RGXLookaheadToken` and `RGXLookbehindToken` is a plain `RGXToken[]`. Collection members such as `mode`, `asUnion()`, `asConcat()`, `toArray()`, `getTokens()`, `toRgx()` and `resolve()` are gone, and array methods like `filter`, `slice` and `concat` return arrays.
- Parameters typed `RGXTokenCollectionInput` are typed `RGXToken`: the constructors of those classes and of `RGXExclusionToken`, `or()`, `group()` and `subtract()` on class tokens, and `expandRgxUnionTokens` and `removeRgxUnionDuplicates`, which also return an `RGXToken[]`.
- For groups and lookarounds, an array lists the tokens to concatenate, and any other token (including an `RGXClassUnionToken`) is the only token. For unions, an array or another `RGXClassUnionToken` lists the alternatives, and any other token is one alternative.
- `rgxParse` returns a non-capturing `RGXGroupToken` where it returned a concat-mode collection, for sequences inside alternatives and at the top level.

Resolved patterns don't change.

To update:

- Replace `new RGXTokenCollection(tokens, "concat")` with `new RGXGroupToken({ capturing: false }, tokens)`, and `new RGXTokenCollection(tokens, "union")` with the array itself or `new RGXClassUnionToken(tokens)`.
- Replace `token.tokens.toArray()`, `token.tokens.tokens` and `token.tokens.getTokens()` with `token.tokens` (use `cloneRGXToken(token.tokens)` if you relied on getting a copy), and `token.tokens.at(i)` with `token.tokens[i]` or `token.tokens.at(i)`, which arrays also have.
- To put a union-mode collection inside a group or lookaround, pass an `RGXClassUnionToken`, or put the array inside another array (`[["a", "b"]]`).
- If you walk the tree `rgxParse` returns, check for non-capturing `RGXGroupToken`s where you checked for collections.

```ts
// Before
const group = new RGXGroupToken({}, new RGXTokenCollection(["a", "b"], "union"));
const first = group.tokens.toArray()[0];

// After
const group = new RGXGroupToken({}, new RGXClassUnionToken(["a", "b"]));
const first = group.tokens[0];
```

## Group flags are the flags in effect inside the group, and inherit by default

`RGXGroupToken.flags` used to list the localizable flags (`i`, `m`, `s`) to turn on, with `''` meaning "no modifier", and a non-empty value always turned off the flags it didn't list. It now works like the flags of literal tokens: it is the set of localizable flags in effect inside the group, and `null`, the new default, means "inherit the flags around the group". The modifier is computed from the flags in effect where the group is placed, so it only appears when something changes.

- `flags: ''` now turns off `i`, `m` and `s` inside the group, instead of meaning "no modifier".
- `flags` defaults to `null`, and `group.flags` reads `null` for groups without flags.
- JSON group tokens with `flags: ""` now deserialize as groups that turn off every localizable flag. JSON from `toJSON()` stores `flags: null` for groups without flags.
- Groups that set flags may output a shorter modifier (for example, `(?i:...)` instead of `(?i-ms:...)` when `m` and `s` are already off), which matches the same strings.
- `rgxParse` converts a modifier group that turns off every flag in effect (such as `(?-i:x)` in an `/i` pattern) into an `RGXGroupToken` with `flags: ''`, instead of interpolation tokens around its contents.

To update:

- Replace `flags: ''` with `flags: null` (or leave it out) where you meant "no modifier", including in stored JSON.
- Where you check `group.flags === ''` or `!group.flags` for "no flags", check `group.flags === null`.

## `rgxParse` merges nested named groups into aliases by default

The `mergeAliases` option of `rgxParse` now defaults to `true`, so a named group whose only contents are another named group (such as `(?<a>(?<b>x))`) becomes a single `RGXGroupToken` with the name `a` and the alias `b`. The resolved pattern is the same, but the tree has one group where it had two.

To update:

- Pass `{ mergeAliases: false }` to keep one `RGXGroupToken` per named group, or read the inner names from `group.aliases`.

## `ExtRegExp` JSON keeps the original source and custom flags

`ExtRegExp` has a new `originalSource` property, which holds the pattern before any custom flag transformations (and is carried over when an `ExtRegExp` is built from another `ExtRegExp`). `rgxTokenToJSON` now stores `originalSource` and the full flags, custom ones included, for `ExtRegExp` literals, and `rgxTokenFromJSON` applies the transformers again when reconstructing them. Before, the JSON stored the transformed source and only the vanilla flags, so the custom flags were lost, and adding one back applied its transformation twice.

- JSON for an `ExtRegExp` with custom flags changes shape. For example, with a transformer `x` that prepends `a`, `new ExtRegExp("b", "gx")` serializes as `{ $rgx: true, source: "b", flags: "gx" }` instead of `{ $rgx: true, source: "ab", flags: "g" }`.
- Deserializing such JSON needs the custom flag transformers to be registered first. Otherwise, it throws `RGXInvalidJSONTokenError`.
- JSON produced by older versions deserializes the same way as before, since it contains no custom flags.

To update:

- Register your custom flag transformers before calling `rgxTokenFromJSON` (or any `fromJSON`) on JSON that may contain them.
- If you compare or store serialized output exactly, update the expected values.

## The accent-insensitive flag covers all accents

`accentInsensitiveFlagTransformer` (the `a` flag when registered with `registerCustomFlagTransformers`) used to cover only a fixed list of accented vowels, written as themselves outside character classes. It now covers every Latin letter with accented forms, using their Unicode decompositions, and also applies to escapes, combining marks and character classes (see [accentInsensitiveFlagTransformer](./docs/ExtRegExp.md#accentinsensitiveflagtransformer)):

- Each accentable character becomes a class of every precomposed form of its letter, followed by any number of combining marks, so decomposed text (such as `e` followed by U+0301) matches too. For example, `ñ` now matches `ń` and `n` followed by U+0303.
- Escapes that produce an accentable character, such as `\u00e9`, are replaced too.
- Character classes containing accentable characters are split into alternatives, and negated ones become a negative lookahead followed by the class. For example, `[a-c]` now matches `ç`, and `[^a]` no longer matches `á`.
- Character sets that match letters, such as `\w` and `\p{L}`, inside or outside classes, also match those letters' accented forms, and negated ones such as `\W` rule them out. For example, `\w+` now matches all of `café`, and `\W` no longer matches `é`. Letters a set matches in both cases share one case-insensitive group, which also lets `\w` match `ẛ` and, with the `u` flag, `ſ` and the Kelvin sign (U+212A). This makes each such set about 500 to 1,000 characters long; call `setAccentInsensitiveSetExpansion(false)` to leave sets as they are.

Patterns using the flag now match strings they didn't match before, and the transformed source is different and longer.

To update:

- If you relied on consonants, other accents, escapes, character classes or character sets being left alone, write those parts in a separate pattern without the flag, or with a literal token that doesn't have it.
- If you compare the transformed source exactly, test what the pattern matches instead.

## `RGXNotDirectRegExpError` is removed

Nothing threw `RGXNotDirectRegExpError` anymore, since `applyFlagTransformers` converts `RegExp` subclasses into plain `RegExp`s instead. The class and the `NOT_DIRECT_REGEXP` error code are removed.

To update:

- Remove imports of `RGXNotDirectRegExpError`, and checks for it or for the `NOT_DIRECT_REGEXP` code.

## Backreferences are validated

Patterns built with `rgx` and `rgxa`, and every walker step, now have their backreferences checked once they're finished (see [Backreference validation](./docs/general.md#backreference-validation)). The patterns that now throw used to compile, but could never match what their group captured. They matched the empty string or literal text instead, so they were almost certainly bugs.

Now throwing `RGXInvalidBackreferenceError`:

- An `RGXSubpatternToken` whose group doesn't exist. Before, `\k<x>` in a pattern with no named groups matched the literal text `k<x>`, and `\5` in a pattern with fewer than 5 groups matched the character `\x05`.
- A backreference matched before its group (`\1(a)`), inside its own group (`(a\1)`), in a different alternative than its group (`(a)|\1`), or pointing into a negative lookaround it isn't in (`(?!(a))\1`). This includes backreferences written directly in `RegExp` literals and interpolations.
- A numeric backreference in a walker step that is a union. The walker wraps each branch in a group, so the number pointed at the wrong group.

When two groups with the same name in the same alternative only meet in the finished pattern (for example, two named group tokens next to each other), they now throw `RGXDuplicateGroupNameError`, which names the group, instead of `RGXInvalidRegexStringError`.

To update:

- Fix or remove the backreference. If you meant to match the text `k<x>`, write it without the backslash.
- In walker steps that are unions, name the group and reference it by name.
- If you catch `RGXInvalidRegexStringError` for duplicate group names, catch `RGXDuplicateGroupNameError` too.

## Walker steps and lexeme definitions are checked when they are created

`rgxwa` and `rgxw` now check each step when the walker is created, and the walker checks each step again before matching it (see [Step validation](./docs/class/walker.md#step-validation)). Along with the backreference checks above:

- A step with unbalanced parentheses throws `RGXInvalidWalkerStepError` when the walker is created. Before, it was accepted and threw `RGXInvalidRegexStringError` only when the walker reached it. This mostly affects `rgxw` with `verbatim: false`, where each literal part of the template is its own step.
- A group name starting with `rgx_branch_` in a step throws `RGXReservedGroupNameError`. The walker uses these names to find out which branch of a union matched, so a step that used one could report the wrong branch.
- `RGXLexer` checks every lexeme definition when it is created (see [validateRGXLexemeDefinition](./docs/class/lexer.md#validatergxlexemedefinition)). The steps of `"walk"` definitions are checked like the steps above, and the token of a `"resolve"` definition gets the same backreference checks as `rgxa`. Before, a bad `"walk"` definition only threw when it was tried, and a bad `"resolve"` definition was used as it was.

To update:

- Make each literal part of a `verbatim: false` template balanced on its own, or move the whole group into a single token.
- Rename groups that start with `rgx_branch_`.

## `RGXPart.token` can be a function

A part's token can now be a function that produces it from the walker's state each time the part is captured (see [Dynamic Parts](./docs/class/walker.md#dynamic-parts)). The `token` property is typed `RGXPartToken<R, S, T>` instead of `RGXToken`, so code that reads `part.token` and passes it on as a token no longer type-checks.

To update:

- To get the token to match a part with, call `part.resolveToken(walker)` instead of reading `part.token`.
- If you only handle static parts, check `part.isDynamic()` first. When it's `false`, `part.token` is an `RGXToken`.

## Walker steps can be unions of parts, and nested unions are flattened

A walker step can now be an array of parts and tokens, nested to any depth (see [Unions of Parts](./docs/class/walker.md#unions-of-parts)). Along with that:

- **Branch numbers count the flattened union.** Every union in a step that is only reachable through other unions (nested arrays and `RGXClassUnionToken`s) is flattened, and `capture.branch` is the position in the flattened list. Before, only the top level was split into branches. For example, in `[["a", "b"], "c"]`, `"c"` used to be branch `1` and is now branch `2`. The same applies to the token of a single part. Steps whose unions aren't nested keep their numbers.
- **Branch groups are hidden from `capture.groups`.** The walker's `rgx_branch_<index>` groups no longer appear in `groups`, and `groups` is `null` when they were the only ones.
- **Types.** The walker's steps are typed `RGXWalkerStep<R, S>` instead of `RGXTokenOrPart<R, S>`. This applies to `walker.tokens`, `currentToken()`, the predicates of `hasNextToken`, `stepToToken` and `stepToTokenAsync`, the token passed to `capture`, `rgxwa`, `rgxw`, and the `tokens` of a `"walk"` lexeme definition. A step you read back from the walker can now be an array that contains parts, so it isn't always an `RGXToken` or an `RGXPart`.

To update:

- If you compare `capture.branch` for a step with nested unions, renumber the branches by their position in the flattened union.
- If you read `rgx_branch_<index>` from `capture.groups`, use `capture.branch` instead.
- Where you typed steps as `RGXTokenOrPart`, use `RGXWalkerStep`, and handle arrays if you read steps back from the walker.

---

# 14.0.0

Most of these changes remove token properties that you used to set by hand, because the library can now work out the same information from the token's resolved source. If you only build patterns from the built-in tokens and classes, you probably won't need to change much. If you write custom convertible tokens, class tokens, or JSON class registrations, read the whole section.

## `rgxIsGroup` is removed

`rgxIsGroup` claimed that a token's output was a single unit a quantifier could apply to as a whole. It was trusted without being checked, so a wrong value could produce a wrong pattern. The library now resolves the token and checks the source itself.

Removed:

- The `rgxIsGroup` property on `RGXConvertibleToken`, `RGXClassToken` and its subclasses.
- The `RGXGroupedToken` and `RGXGroupedConvertibleToken` types.
- `isRGXGroupedToken` and `assertRGXGroupedToken`.

To update:

- Delete `rgxIsGroup` from your custom tokens. It no longer has any effect.
- Replace `isRGXGroupedToken(token)` with `isRGXSingletonToken(token)` (and the assert version with `assertRGXSingletonToken`). The new guard resolves the token and checks whether the result is a single character, escape, character class, or group. Its signature is `(value, acceptJSON = true)`, so it no longer takes `contentCheck`.
- `RGXRepeatToken` now stores the token you give it as-is. `repeatToken.token` is typed `RGXToken` instead of `RGXGroupedToken`, and it's no longer wrapped in a non-capturing `RGXGroupToken`. That also applies to the token in the `toJSON()` args. If you read `repeatToken.token` and expected an `RGXGroupToken`, use the token directly.

```ts
// Before
const token = { rgxIsGroup: true, toRgx: () => /[a-z]/ };
if (isRGXGroupedToken(token)) { /* ... */ }

// After
const token = { toRgx: () => /[a-z]/ };
if (isRGXSingletonToken(token)) { /* ... */ }
```

## `rgxGroupWrap` is removed

Convertible tokens are now always resolved as if `rgxGroupWrap` were unset, so their output is wrapped in a non-capturing group when needed. Groups that turn out to be unnecessary are removed from the final pattern, so the size benefit of `rgxGroupWrap: false` is no longer needed.

To update:

- Delete `rgxGroupWrap` from your custom tokens.
- If you relied on `rgxGroupWrap: false` to let an alternation leak into the surrounding pattern (for example, a token returning `/a|b/` next to `c` producing `a|bc`), use an interpolation token instead (see the next section).
- The `groupWrap` option of `resolveRGXToken` and `rgxConcat` still exists, but it now only affects the top level. If you compare intermediate resolver output exactly, some of it can now contain extra groups, such as `(?:\d)`. Final patterns from `rgx` and `rgxa` don't keep them.
- JSON literal tokens created by `rgxTokenToJSON` and the default `RGXClassToken.toJSON()` now have redundant groups removed from their `source`. If you compare serialized output exactly, update the expected values.

## Interpolation is its own token type

Interpolation used to be a flag on convertible tokens (`rgxInterpolate: true`). It's now a separate token type, `RGXInterpolationToken`, which is a plain object holding the raw source fragment:

```ts
type RGXInterpolationToken = { readonly rgxInterpolation: string };
```

Removed: the `rgxInterpolate` property on `RGXConvertibleToken` and `RGXClassToken`.

To update:

```ts
// Before
rgxa([{ rgxInterpolate: true, toRgx: () => "(?<word>" }, /\w+/, { rgxInterpolate: true, toRgx: () => ")" }]);

// After
rgxa([rgxInterpolation("(?<word>"), /\w+/, rgxInterpolation(")")]);
// or write the objects directly: { rgxInterpolation: "(?<word>" }
```

Other effects:

- Interpolation tokens aren't convertible tokens. They have no `toRgx` method, and `isRGXConvertibleToken` returns `false` for them. Use `isRGXInterpolationToken` / `assertRGXInterpolationToken`.
- `RGXTokenType` has a new `'interpolation'` member, and `rgxTokenTypeFlat` returns `'interpolation'` for these tokens. If you `switch` over token types, add a case for it.
- In tagged templates with `verbatim: false`, the literal string parts are now interpolation tokens instead of convertible tokens. If you inspect the token list (for example, a walker's `tokens`), check for the new type.
- Interpolation tokens are never repeatable. Passing one to `RGXRepeatToken` throws `RGXNotSupportedError`.
- They serialize to a new JSON form, `{ $rgx: true, interpolation: "..." }` (`RGXJSONInterpolationToken`), which stores the fragment as-is. `RGXJSONObjectToken` now includes this type, so code that assumed every JSON object token has either `source` or `class` needs to handle `interpolation` too. Use `isRGXJSONInterpolationToken` to check for it.

## `rgxIsRepeatable` is detected when it isn't set

Previously, a token without `rgxIsRepeatable` was always treated as repeatable. Now, a missing value means "detect": the token is repeatable unless its resolved source consumes no characters, meaning it's made entirely of assertions such as `^`, `$`, `\b`, `\B` and lookarounds. This applies to convertible tokens, literal tokens (`RegExp`s) and arrays.

- If `rgxIsRepeatable` is set to `true` or `false`, it's still trusted.
- If it's explicitly `true` on a token that consumes no characters, repeating the token is allowed, but a warning is printed with `console.warn` (once per token).
- `RGXClassToken.rgxIsRepeatable` now returns `undefined` by default instead of `true`. Its type is `boolean | undefined`.
- `RGXRepeatableConvertibleToken` is now `RGXConvertibleToken & { readonly rgxIsRepeatable?: true }`.

To update:

- Code that repeats a zero-width token, such as `rgxRepeat(/\b/)` or a custom anchor token, now throws `RGXNotSupportedError`. Remove the repeat (it never had any effect), or set `rgxIsRepeatable: true` on the token if you really want it.
- If you read `token.rgxIsRepeatable` and expected a `boolean` on every class token, handle `undefined`, or use `isRGXToken(token, "repeatable")` to get the final answer.
- You can remove `rgxIsRepeatable: false` from custom zero-width tokens, since detection now gives the same result. Keep it on tokens that consume characters but still shouldn't be repeated.

## `rgxAcceptInsertion` receives a context object

The hook used to receive `(tokens, flags)`, and it was only called for tokens at the top level of `rgx`/`rgxa`/`rgxConcat`. Tokens nested in groups, lookarounds, repeats and collections were checked inconsistently, and usually with empty flags. Now every placement is checked exactly once at any depth, and the hook receives an `RGXInsertionContext`:

```ts
type RGXInsertionContext = {
    readonly flags: ValidRegexFlags;              // effective here, including enclosing modifier groups
    readonly siblings: readonly RGXToken[];       // what `tokens` used to be
    readonly index: number;                       // this token's position in `siblings`
    readonly parent: RGXInsertionContext | null;  // the enclosing level, or null at the top level
    readonly container: RGXToken | null;          // the token whose contents this level is
};
```

To update:

```ts
// Before
rgxAcceptInsertion(tokens, flags) {
    return flags.includes("i") || "Requires the i flag";
}

// After
rgxAcceptInsertion({ flags }) {
    return flags.includes("i") || "Requires the i flag";
}
```

Other effects:

- Patterns that built fine before can now throw `RGXInsertionRejectedError`, because nested tokens are checked with their real flags. For example, a token inside `RGXGroupToken` with `flags: "i"` now sees the `i` flag, and a token inside a plain group no longer sees an empty flag string when the pattern has flags.
- The hook only runs while a pattern is being built (`rgx`, `rgxa`, `rgxw`, `rgxwa`). Calling `resolveRGXToken` on its own, `toJSON()`, and the type guards don't run it. `isRGXConvertibleToken` only checks that the hook is callable, and no longer calls it to check its return value.
- `RGXInsertionRejectedError` has a new `context` property and a third constructor parameter for it. Its message now includes the path to the rejected token (for example, `index 1 > 0`) and its containers.

## JSON class construction is a single step

Validating JSON class args and constructing the class used to be two separate functions. They're now one function that validates its own args and throws if they're invalid.

Removed:

- `RGXJSONClassRegistryEntry` and `RGXJSONClassArgsValidator`.
- `validateRGXJSONClassArgs` and `assertValidRGXJSONClassArgs`.
- The static `validateJSONArgs` method on `RGXClassToken` and the `RGXJSONClassTokenConstructor` type.
- `validateLookaroundJSONArgs`.

Changed:

- `registerRGXJSONClass(name, construct)` takes the constructor function directly and returns nothing.
- `registerRGXJSONClassToken(name, constructor)` only needs a static `fromJSON` on the class.
- `getRGXJSONClass(name)` returns the constructor function, which you call directly.
- `rgxJSONClassArgs(json, name, parse)` takes a parser instead of a validator. The parser returns the typed args, or a string explaining why they were rejected. `rgxJSONClassArgs` returns the parser's result, so you no longer need a type assertion. The parser type is `RGXJSONClassArgsParser<A>`.
- `isRGXJSONClassToken` (with `registryCheck`) now tries to construct the class and returns `false` if that throws an `RGXError`.

To update a custom registration:

```ts
// Before
registerRGXJSONClass("MyToken", {
    validateArgs: args => args.length === 1 && typeof args[0] === "string",
    construct: args => new MyToken(args[0] as string)
});

// After
registerRGXJSONClass("MyToken", args => {
    if (args.length !== 1 || typeof args[0] !== "string") {
        throw new RGXJSONClassArgsValidationFailedError("MyToken", args, "Expected one string argument.");
    }
    return new MyToken(args[0]);
});
```

To update a custom class token:

```ts
// Before
class MyToken extends RGXClassToken {
    static validateJSONArgs(args: RGXJSONValue[]) {
        return args.length === 1 && typeof args[0] === "string";
    }

    static fromJSON(json: RGXJSONClassToken) {
        const [name] = rgxJSONClassArgs(json, "MyToken", MyToken.validateJSONArgs) as [string];
        return new MyToken(name);
    }
}

// After
function parseMyTokenArgs(args: RGXJSONValue[]): [string] | string {
    if (args.length !== 1 || typeof args[0] !== "string") return "Expected one string argument.";
    return [args[0]];
}

class MyToken extends RGXClassToken {
    static fromJSON(json: RGXJSONClassToken) {
        const [name] = rgxJSONClassArgs(json, "MyToken", parseMyTokenArgs);
        return new MyToken(name);
    }
}
```

Replace calls like `getRGXJSONClass(name).construct(args)` with `getRGXJSONClass(name)(args)`. Replace `validateRGXJSONClassArgs(name, args)` by constructing the class and catching the error, or use `isRGXJSONClassToken`.

---

# 13.0.0

## `resolveRGXToken` takes an options object

```ts
// Before
resolveRGXToken(token, false, true, "i");

// After
resolveRGXToken(token, { groupWrap: false, topLevel: true, currentFlags: "i" });
```

All options are optional and keep their previous defaults. `rgxConcat` is unchanged.

## `rgxConstant` always returns a class token

`rgxConstant(name)` now returns an `RGXClassToken`. Constants that were defined as plain convertible tokens are wrapped in an `RGXClassWrapperToken`, so you can call class methods such as `.repeat()` and `.or()` on any constant. If you relied on a constant being the plain object it was defined as, unwrap it with `.token`.

## `word-bound-start` and `word-bound-end` match at the edges of the string

These constants used to require a non-word character on the outer side, so they failed to match a word at the very start or end of the string. They now also match there. If you relied on the old behavior to skip words at the edges, add an explicit lookaround.

---

# 12.0.0

## `rgx` takes an options object

```ts
// Before
rgx("i", false, false)`...`;

// After
rgx("i", { multiline: false, verbatim: false })`...`;
```

This matches `rgxw`, which already took an options object.

Version 12.1.0 also changed tagged templates to read their string parts raw (`strings.raw`), so backslash sequences in the template text reach the pattern exactly as written instead of being processed by JavaScript first. If you wrote doubled backslashes in template text to work around this, check that those patterns still match what you expect.

---

# 11.0.0

## Part callbacks receive a context object

`RGXPart` callbacks used to receive the walker's `share`, the part and the walker as separate parameters. They now receive a single `RGXPartContext` with `part` and `walker`. Read `share` from `context.walker.share`.

```ts
// Before (9.x and 10.x)
rgxPart(token, {
    validate: (capture, share, part, walker) => capture.value.length > 0,
    afterCapture: (capture, share, part, walker) => { share.count++; }
});

// After
rgxPart(token, {
    validate: (capture, { part, walker }) => capture.value.length > 0,
    afterCapture: (capture, { walker }) => { walker.share.count++; }
});
```

This applies to `validate`, `beforeCapture`, `afterCapture`, `afterFailure` and `afterValidationFailure`. The `part.validate(capture, context)` method changed the same way.

## `walk()` returns the reduced value

`RGXWalker.walk()` now returns `walker.reduced` instead of the walker. If you chained calls after `walk()`, call them on the walker separately.

```ts
// Before
const result = walker.walk().reduced;

// After
const result = walker.walk();
```

## Flag transformers return a source and flags

A `RegExpFlagTransformer` now has the type `(exp: RegExp) => [string, string]`. It returns the new source and vanilla flags instead of a new `RegExp`, and the library builds the regex itself, so it can report invalid output as an `RGXError`.

```ts
// Before
const transformer = (exp: RegExp) => new RegExp(exp.source.replaceAll("a", "[aA]"), exp.flags);

// After
const transformer = (exp: RegExp): [string, string] => [exp.source.replaceAll("a", "[aA]"), exp.flags];
```

Flag transformers can only be applied to direct `RegExp` instances. Passing a subclass (such as `ExtRegExp`) to `applyFlagTransformers` throws `RGXNotDirectRegExpError`.

Patterns built internally by the library now go through `createRegex`, so an invalid pattern throws `RGXInvalidRegexStringError` instead of a plain `SyntaxError`. If you caught `SyntaxError` around RGX calls, catch `RGXInvalidRegexStringError` instead.

---

# 9.0.0

## Walkers and parts have a `share` generic

Walkers gained a `share` value, a piece of mutable state shared between parts that isn't part of the reduced result. To support it, a new generic `S` was added **before** `T` on the part types:

- `RGXPart<R, T>` is now `RGXPart<R, S, T>`, and the same applies to `rgxPart`, `RGXPartOptions` and `RGXTokenOrPart`.
- `RGXWalker<R>` is now `RGXWalker<R, S>`, and the same applies to `rgxWalker`, `RGXWalkerOptions`, `rgxw`, `rgxwa` and `RGXWOptions`.
- `RGXLexer<Data>` is now `RGXLexer<Data, Share>`. The `share` option of a lexeme definition is a function that creates the initial value, so each walker gets its own.

If you passed `T` explicitly, insert the share type before it:

```ts
// Before
rgxPart<MyReduced, number>(token, { /* ... */ });

// After
rgxPart<MyReduced, unknown, number>(token, { /* ... */ });
```

This version also changed the part callback parameters, but 11.0.0 replaced them again. See [11.0.0](#1100) for the current form.

---

# 8.0.0

## Walkers and parts are no longer tokens

`RGXWalker` and `RGXPart` used to be convertible tokens, which let a walker accept tokens that didn't fit its reduced value. They're now plain classes.

- You can't pass a walker or a part to `rgx`, `rgxa` or any other function that expects a token. To use the pattern a part matches, pass `part.token` instead.
- `walker.tokens` is now a plain array of `RGXTokenOrPart` instead of an `RGXTokenCollection`, and the `RGXWalker` constructor takes an array. Use array methods (`walker.tokens[i]`) instead of collection methods (`walker.tokens.at(i)`).

---

# 7.0.0

## `namedCaptures` stores arrays

`walker.namedCaptures` now maps each part ID to an array of every capture made with that ID, in order, instead of only the most recent one.

```ts
// Before
const capture = walker.namedCaptures["word"];

// After
const captures = walker.namedCaptures["word"];
const capture = captures?.at(-1); // the most recent one
```

Captures also have a new `ownerId` property with the ID of the part that made them, or `null`.
