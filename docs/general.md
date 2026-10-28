# Type Reference
The following is a reference to types relevant to the components listed in this file. The full type reference for the library can be found in [type-reference.md](./type-reference.md).

```typescript
type RGXNoOpToken = null | undefined;
type RGXLiteralToken = RegExp;
type RGXNativeToken = string | number | boolean | RGXNoOpToken;
type RGXInsertionContext = {
    readonly flags: ValidRegexFlags;              // effective at this position, including enclosing modifier groups
    readonly siblings: readonly RGXToken[];       // the tokens at the same level, including this one
    readonly index: number;                       // this token's position in siblings
    readonly parent: RGXInsertionContext | null;  // the enclosing level, or null at the top level
    readonly container: RGXToken | null;          // the token whose contents this level is, or null at the top level
};
type RGXConvertibleToken = {
    toRgx: (currentFlags?: string) => RGXToken,   // currentFlags: the flags in effect where the token is placed
    rgxAcceptInsertion?: (context: RGXInsertionContext) => string | boolean,
    readonly rgxIsRepeatable?: boolean
};
type RGXInterpolationToken = { readonly rgxInterpolation: string };
type RGXJSONPrimitive = string | number | boolean | null;
type RGXJSONObject = { [key: string]: RGXJSONValue | undefined };
type RGXJSONValue = RGXJSONPrimitive | RGXJSONValue[] | RGXJSONObject;
type RGXJSONNativeToken = Exclude<RGXNativeToken, undefined>;
type RGXJSONLiteralToken = { $rgx: true, source: string, flags?: string };
type RGXJSONClassToken = { $rgx: true, class: string, args?: RGXJSONValue[] };
type RGXJSONInterpolationToken = { $rgx: true, interpolation: string };
type RGXJSONObjectToken = RGXJSONLiteralToken | RGXJSONClassToken | RGXJSONInterpolationToken;
type RGXJSONToken = RGXJSONNativeToken | RGXJSONObjectToken | RGXJSONToken[];
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXInterpolationToken | RGXJSONObjectToken | RGXToken[];

const validRegexSymbol = Symbol('rgx.ValidRegex');
type ValidRegexBrandSymbol = typeof validRegexSymbol;
type ValidRegexString = Branded<string, [ValidRegexBrandSymbol]>;

type ResolveRGXTokenOptions = {
    groupWrap?: boolean;
    topLevel?: boolean;
    currentFlags?: string;
};

const validVanillaRegexFlagsSymbol = Symbol('rgx.ValidVanillaRegexFlags');
type ValidVanillaRegexFlagsBrandSymbol = typeof validVanillaRegexFlagsSymbol;
type ValidVanillaRegexFlags = Branded<string, [ValidVanillaRegexFlagsBrandSymbol]>;

const validRegexFlagsSymbol = Symbol('rgx.ValidRegexFlags');
type ValidRegexFlagsBrandSymbol = typeof validRegexFlagsSymbol;
type ValidRegexFlags = Branded<string, [ValidRegexFlagsBrandSymbol]> | ValidVanillaRegexFlags;

type RegExpFlagTransformer = (exp: RegExp) => [string, string];

const validIdentifierSymbol = Symbol('rgx.ValidIdentifier');
type ValidIdentifierBrandSymbol = typeof validIdentifierSymbol;
type ValidIdentifier = Branded<string, [ValidIdentifierBrandSymbol]>;

type RGXWalkerOptions<R> = {
    startingSourcePosition?: number;
    reduced?: R;
    infinite?: boolean;
    looping?: boolean;
};

type RGXOptions = {
    multiline?: boolean;
    verbatim?: boolean;
};

type RGXWOptions<R = unknown> = RGXWalkerOptions<R> & RGXOptions & {
    mergeSteps?: boolean;
};
```

# rgx (default export)
```typescript
function rgx(flags?: string, options?: RGXOptions): (strings: TemplateStringsArray, ...tokens: RGXToken[]) => ExtRegExp
```

Creates and returns a template tag function that constructs an `ExtRegExp` object from the provided template literal with the provided flags. The template literal is interpreted as a raw string, meaning any escape sequences are left as-is instead of being resolved to their charcter equivalents. The template literal can contain RGX tokens, which will be resolved and concatenated with the literal parts to form the final regex pattern. Redundant non-capturing groups in the final pattern are removed (see `resolveRGXToken` and `rgxa`), including ones written directly in the template, while capturing, named, inline modifier, and lookaround groups are always kept. Insertion checks (see `rgxAcceptInsertion` in [base.md](./class/token/base.md)) run while the pattern is built: every convertible token that defines `rgxAcceptInsertion`, at any depth, is called once for each place it is inserted, with an `RGXInsertionContext` describing that place; if it returns `false` or a string, an `RGXInsertionRejectedError` is thrown with details about the reason and exactly where the rejection occurred. Once the pattern is finished, its backreferences are validated (see [Backreference validation](#backreference-validation) under `rgxa`).

When `multiline` is `true` (the default), the literal string parts of the template are processed to strip newlines, trim leading whitespace from each line, and remove empty lines, then joined together. This allows you to write regex patterns across multiple lines in the source code for readability without the newlines and indentation becoming part of the pattern. Only the literal string parts between tokens are affected — interpolated values (tokens) are preserved as-is, including string tokens passed via `${"..."}`. Also, comments (denoted with `//`) ending a line or on a line by themselves are stripped. If a command ends a line, that line is also stripped of whitespace on the right side.

When `multiline` is `false`, all literal string parts are preserved exactly as written, including newlines and whitespace.

When `verbatim` is `true` (the default), the literal string parts of the template are treated as verbatim text to be matched literally: special regex characters (such as `|`, `.`, `*`) are escaped before being inserted into the pattern. When `verbatim` is `false`, literal string parts are inserted as raw regex syntax — special characters are not escaped and work as regex operators. Each literal string part becomes an interpolation token (see `rgxInterpolation`), so a part may open a group that a later part closes. Note that interpolated values (tokens) are always resolved normally regardless of this setting: string tokens via `${"..."}` are always escaped.

The provided `flags` are passed as `currentFlags` to the resolver, enabling inline modifier groups for any `RegExp` literal tokens whose localizable flags (`i`, `m`, `s`) differ from the parent flags. For example, embedding `/foo/i` in a no-flag context produces `(?i:foo)`, while embedding `/bar/` in an `i`-flag context produces `(?-i:bar)`.

Example usages:
```typescript
const beginning = /^/;
const end = /$/;
const word = /\w+/;
const pattern = rgx()`${beginning}testing ${word}${end}`; // /^testing \w+$/ - matches the string "testing " followed by a word, anchored to the start and end of the string

const optionalDigit = /\d?/;
const pattern2 = rgx()`${beginning}optional digit: ${optionalDigit}${end}`; // /^optional digit: \d?$/ - matches the string "optional digit: " followed by an optional digit, anchored to the start and end of the string

const pattern3 = rgx()`${beginning}value: ${[word, optionalDigit]}${end}`; // /^value: (?:\w+|\d?)$/ - matches the string "value: " followed by either a word or an optional digit, anchored to the start and end of the string

const caseInsensitiveWord = /hello/i;
const pattern4 = rgx()`${beginning}${caseInsensitiveWord} world${end}`; // /^(?i:hello) world$/ - "hello" matches case-insensitively via an inline modifier group, while " world" remains case-sensitive

// Multiline template for readability (multiline is true by default):
const pattern5 = rgx()`
    ${beginning}
    testing ${word}
    ${end}
`; // /^testing \w+$/ - same as pattern, but written across multiple lines

// Preserving literal newlines with multiline mode:
const pattern6 = rgx()`
    foo
    bar${rgxConstant("newline")}
    baz
`; // /foobar\nbaz/ - the constant newline is preserved, but template newlines are stripped
```

## Parameters
**Direct**
  - `flags` (`string`, optional): The regex flags to apply to the resulting `ExtRegExp` object (e.g., 'g', 'i', 'm', or custom registered flags). If not provided, no flags will be applied. If provided and not valid regex flags (vanilla or registered custom), an `RGXInvalidRegexFlagsError` will be thrown when the returned template tag function is called, not when `rgx()` itself is called.
  - `options` (`RGXOptions`, optional): An object containing optional configuration for the template tag.
    - `multiline` (`boolean`, optional): Whether to strip newlines and trim leading whitespace from the literal string parts of the template. Defaults to `true`. When `true`, each literal string part is split by newlines, each line has its leading whitespace trimmed, empty lines are removed, comments (denoted with `//`) ending a line or on a line by themselves are stripped, and the remaining lines are joined together. Interpolated tokens (including string tokens via `${"..."}`) are not affected. When `false`, literal string parts are preserved exactly as written.
    - `verbatim` (`boolean`, optional): Whether to treat literal string parts of the template as verbatim text. Defaults to `true`. When `true`, literal string parts are escaped so that special regex characters are matched literally. When `false`, literal string parts are inserted as raw regex syntax without escaping. Interpolated values (including string tokens via `${"..."}`) are always escaped regardless of this setting.

**Template Tag**
  - `strings` (`TemplateStringsArray`): The literal parts of the template string.
  - `tokens` (`RGXToken[]`): The RGX tokens to be resolved and concatenated with the literal parts.

## Returns
- `(strings: TemplateStringsArray, ...tokens: RGXToken[]) => ExtRegExp`: A template tag function that takes a template literal and returns an `ExtRegExp` object constructed from the resolved tokens, literal parts, and the provided flags.

## Engine bug workarounds
Every finished pattern the library compiles goes through the registered pattern transformers before it is compiled: patterns built with `rgx` and `rgxa`, every `ExtRegExp`, each step a walker matches, and each lexeme definition a lexer matches. The built-in transformers work around V8 bugs with the modifier groups the library generates, so patterns match the way the specification says they should. See [pattern-transformer.md](./pattern-transformer.md).

# rgxa
```typescript
function rgxa(tokens: RGXToken[], flags?: string): ExtRegExp
```
As an alternative to using the `rgx` template tag, you can directly call `rgxa` with an array of RGX tokens and optional flags to get an `ExtRegExp` object. This is useful in cases where you don't want to use a template literal. Like `rgx`, the provided `flags` are passed as `currentFlags` to the resolver, enabling inline modifier groups for `RegExp` literal tokens whose localizable flags differ. Insertion checks (see `rgxAcceptInsertion` in [base.md](./class/token/base.md)) run while the pattern is built, with the given `flags` at the top level: every convertible token that defines `rgxAcceptInsertion`, at any depth, is called once for each place it is inserted, with an `RGXInsertionContext` describing that place; if it returns `false` or a string, an `RGXInsertionRejectedError` is thrown with details about the reason and exactly where the rejection occurred. Since nothing else is added to the final pattern, redundant non-capturing groups at its start and end are removed as well, so `rgxa([/a/, /b/])` produces `ab` rather than `(?:a)(?:b)`.

## Backreference validation
Once the final pattern is built, and before it is compiled, its backreferences are checked, so a reference that can never match what its group captured throws instead of silently matching the empty string or literal text. The engine accepts most of these patterns without complaint. An `RGXInvalidBackreferenceError` is thrown, with a `reason` saying what is wrong, when a backreference:

- points to a group that doesn't exist (`"missing-group"`), such as an `RGXSubpatternToken` for `"x"` in a pattern with no group named `x`, or for `5` in a pattern with fewer than 5 groups. The engine would read these as literal text (`\k<x>`) or a character escape (`\5`).
- is matched before its group (`"before-group"`), such as `\1(a)`. Inside a lookbehind, which is matched from right to left, this means a reference written after its group.
- is inside its own group (`"inside-group"`), such as `(a\1)`.
- is in a different alternative than its group (`"other-branch"`), such as `(a)|\1`. Captures are cleared at the start of each repetition, so this includes references to a group in another alternative of a repeated group, such as `(?:\1b|(a))+`.
- points to a group inside a negative lookaround that the reference isn't in (`"negative-lookaround"`), such as `(?!(a))\1`, since the lookaround discards its captures.

A name that several groups share (which is allowed when they are in different alternatives) is valid as long as one of those groups is. If two groups in the same alternative share a name, an `RGXDuplicateGroupNameError` naming the group is thrown instead of the engine's error.

Missing groups are found through the `RGXSubpatternToken`s that were resolved while building the pattern, which is the only way to tell them apart from literal text. References written directly in literal or interpolation tokens are checked for the other problems, but a missing group is only found there when the engine reads them as a reference. Only finished patterns are checked, so `resolveRGXToken` and `rgxConcat` accept fragments that reference a group added later. Patterns built with the `ExtRegExp` constructor aren't checked.

## Parameters
  - `tokens` (`RGXToken[]`): The RGX tokens to be resolved and concatenated to form the regex pattern.
  - `flags` (`string`, optional): The regex flags to apply to the resulting `ExtRegExp` object (e.g., 'g', 'i', 'm', or custom registered flags). If not provided, no flags will be applied. If provided and not valid regex flags (vanilla or registered custom), an `RGXInvalidRegexFlagsError` will be thrown.

## Returns
- `ExtRegExp`: An `ExtRegExp` object constructed from the resolved tokens and the provided flags. Throws `RGXInvalidBackreferenceError` or `RGXDuplicateGroupNameError` if the pattern fails [backreference validation](#backreference-validation).

# resolveRGXToken
```typescript
function resolveRGXToken(token: RGXToken, options?: ResolveRGXTokenOptions): ValidRegexString
```

Resolves an RGX token to a string. No-op tokens resolve to an empty string, literal tokens are included as-is (wrapped in a non-capturing group when `groupWrap` is `true`), native tokens are converted to strings and escaped, interpolation tokens (see `rgxInterpolation`) are inserted as-is without escaping, convertible tokens are converted using their `toRgx` method and then resolved recursively, and arrays of tokens are resolved as unions of their resolved elements (repeats removed, placed in a non-capturing group when `groupWrap` is `true`).

JSON object tokens (see [json.md](./json.md)) are converted with `rgxTokenFromJSON` before resolving, so a JSON literal token resolves exactly like the `ExtRegExp` it describes and a JSON class token resolves exactly like the class token it describes. No conversion is needed beforehand; this applies to JSON tokens nested at any depth, since nested tokens are resolved recursively. Invalid JSON object tokens throw the error `rgxTokenFromJSON` would throw (e.g. `RGXInvalidJSONClassKeyError` for an unregistered class).

For literal tokens (`RegExp` instances), if the token's flags differ from `currentFlags` in any of the localizable flags (`i`, `m`, `s`), the token is wrapped in an inline modifier group (e.g., `(?i:...)`, `(?-i:...)`, `(?ms-i:...)`) instead of a plain non-capturing group. Non-localizable flags (such as `g`, `u`, `y`, `d`, `v`) are ignored when computing the diff. When an inline modifier group is used, it always wraps the token regardless of the `groupWrap` setting, since the modifier group itself serves as a group.

For convertible tokens, `toRgx(currentFlags)` is called with the `currentFlags` option, so the token can resolve its contents with the flags in effect where it is placed. The built-in class tokens do this, and return a `RegExp` with the same localizable flags, so they inherit the flags around them. The `toRgx()` result is resolved with the `groupWrap` option at the top level, and with `groupWrap` set to `true` in recursive calls, regardless of the option. This ensures that the caller's `groupWrap` preference only affects the outermost convertible token and does not leak into deeply nested resolution. Since wrapping is always safe, an alternation returned by a nested convertible token never leaks into its surroundings: a token returning `/a|b/` next to `c` resolves to `(?:a|b)c`. Wrapping can leave extra groups in intermediate output (for example, a convertible token returning `/\d/` resolves to `(?:\d)`, since the group is at the edge of a result that may be concatenated with other text), but they are removed from the final pattern by `rgxa` and from serialized JSON.

Each result is checked on its own before it is placed, with the unicode flag (`u` or `v`) in `currentFlags` first. Since a piece of a pattern may only be valid in context (such as a backreference to a group outside of it, which the `u` flag rejects on its own), a result is accepted if it is valid with any of the unicode modes. The whole pattern is checked with its real flags when it is built (for example, by `rgxa`).

At the top level, after the result is validated, non-capturing groups (`(?:...)`) that don't change how the pattern is read are removed, so `resolveRGXToken(["abc", /def/])` produces `(?:abc|def)` rather than `(?:abc|(?:def))`. Capturing, named, inline modifier, and lookaround groups are never removed. A group is kept when a quantifier after it must apply to more than one unit, when alternatives inside it would merge with units outside of it, when it is empty, or when removing it would join two units into one (for example, `(?:\1)0` must not become `\10`). Since the result may be concatenated with other text, groups at its start and end are only removed when no text placed next to them could change how they are read, so a result resolved with `groupWrap` set to `true` can still be followed by a quantifier. Results with unbalanced parentheses from interpolation tokens are returned without removing any groups.

## Parameters
  - `token` (`RGXToken`): The RGX token to resolve.
  - `options` (`ResolveRGXTokenOptions`, optional): An object containing optional configuration for the resolver.
    - `groupWrap` (`boolean`, optional): Whether to wrap literal tokens and array unions in non-capturing groups (`(?:...)`). Defaults to `true`. When `false`, literals use their raw source and array unions omit the wrapping group. For convertible tokens, this value is only passed through at the top level (in recursive calls it falls back to `true`). Array union elements always use `groupWrap=true` internally. Note that when a literal token requires an inline modifier group due to a localizable flag diff, it is always wrapped regardless of this setting.
    - `topLevel` (`boolean`, optional): Tracks whether the current call is the initial (top-level) invocation. Defaults to `true`. **Warning**: This field is intended for internal use by the resolver's own recursion. External callers should not set this field, as doing so may produce unexpected wrapping behavior.
    - `currentFlags` (`string`, optional): The flags of the current regex context, used to compute inline modifier groups for literal tokens. Defaults to `''`. When a literal token's localizable flags (`i`, `m`, `s`) differ from this value, the resolver wraps the token in an inline modifier group that adds or removes the differing flags locally. If invalid regex flags are provided, an `RGXInvalidRegexFlagsError` will be thrown.

## Returns
- `ValidRegexString`: The resolved string representation of the RGX token. The result is asserted to be a valid regex string before being returned. If the result is invalid for any reason other than a parenthesis error (unmatched `(` or `)`), an `RGXInvalidRegexStringError` is thrown. If the result has a parenthesis error *and* the token is an interpolation token, the result is returned as-is rather than throwing — the expectation is that a subsequent token in a concatenation will balance the parentheses (or a previous token has already opened a group); if it doesn't, the overall regex construction will catch it.

# rgxInterpolation
```typescript
function rgxInterpolation(source: string): RGXInterpolationToken
```
Creates an interpolation token: a raw source fragment that is inserted into the pattern as-is, without escaping. It is the only way to insert source that may have unbalanced parentheses, since native tokens are escaped and literal tokens must be valid regexes on their own. The fragment may open a group that a later token closes (or close one that an earlier token opened); if the final pattern is still unbalanced, building it throws. Walker steps are matched on their own, so no later token can balance them: a walker rejects an unbalanced step with an `RGXInvalidWalkerStepError` when it is created (see `rgxwa` in [walker.md](./class/walker.md)). The `mergeSteps` option of `rgxw` and `rgxwa` combines adjacent steps without parts into one, so they can balance each other. This is what the `rgx` and `rgxw` template tags insert for the literal parts of a template when `verbatim` is `false`.

An interpolation token is a plain object (`{ rgxInterpolation: source }`), so it can also be written directly. It is its own token type (`'interpolation'`), not a convertible token: it has no `toRgx` method, and it is never repeatable, since repeating half a group is meaningless (`RGXRepeatToken` throws `RGXNotSupportedError` for it). It serializes to a JSON interpolation token (see [json.md](./json.md)) that stores the fragment as-is.

```typescript
rgxa([rgxInterpolation("(?<word>"), /\w+/, rgxInterpolation(")")]); // /(?<word>\w+)/
```

## Parameters
  - `source` (`string`): The source fragment to insert.

## Returns
- `RGXInterpolationToken`: The interpolation token.

# rgxConcat
```typescript
function rgxConcat(tokens: RGXToken[], groupWrap?: boolean, currentFlags?: string): ValidRegexString
```
A helper function that resolves an array of RGX tokens and concatenates their resolved string representations together. Redundant non-capturing groups left by joining the resolved tokens are then removed, following the same rules as `resolveRGXToken`. When called while a pattern is being built (by `rgxa`, `rgx`, or a container such as an `RGXGroupToken` resolved inside one), each token in the array is checked for acceptance at its position, with the array as its siblings, before it is resolved (see `rgxAcceptInsertion` in [base.md](./class/token/base.md)). When called on its own, no insertion checks run.

## Parameters
  - `tokens` (`RGXToken[]`): The array of RGX tokens to resolve and concatenate.
  - `groupWrap` (`boolean`, optional): Whether to wrap individual resolved tokens in non-capturing groups. Passed through to `resolveRGXToken`. Defaults to `true`.
  - `currentFlags` (`string`, optional): The flags of the current regex context, passed through to `resolveRGXToken` as its `currentFlags` parameter. Used to compute inline modifier groups for literal tokens whose localizable flags differ. Defaults to `''`. If invalid regex flags are provided, an `RGXInvalidRegexFlagsError` will be thrown.

## Returns
- `ValidRegexString`: The concatenated string representation of the resolved RGX tokens. Each token is resolved via `resolveRGXToken`; invalid regex syntax throws an `RGXInvalidRegexStringError`, except that parenthesis errors (unmatched `(` or `)`) from interpolation tokens are tolerated (see `resolveRGXToken` returns for details), as a subsequent token in the array may balance the parentheses (or a previous token has already opened a group).