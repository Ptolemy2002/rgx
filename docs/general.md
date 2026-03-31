# Type Reference
The following is a reference to types relevant to the components listed in this file. The full type reference for the library can be found in [type-reference.md](./type-reference.md).

```typescript
type RGXNoOpToken = null | undefined;
type RGXLiteralToken = RegExp;
type RGXNativeToken = string | number | boolean | RGXNoOpToken;
type RGXConvertibleToken = {
    toRgx: () => RGXToken,
    rgxAcceptInsertion?: (tokens: RGXToken[], flags: ValidRegexFlags) => string | boolean,
    readonly rgxGroupWrap?: boolean,
    readonly rgxIsGroup?: boolean,
    readonly rgxIsRepeatable?: boolean,
    readonly rgxInterpolate?: boolean
};
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXToken[];

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

type RGXWOptions<R = unknown> = RGXWalkerOptions<R> & RGXOptions;
```

# rgx (default export)
```typescript
function rgx(flags?: string, options?: RGXOptions): (strings: TemplateStringsArray, ...tokens: RGXToken[]) => ExtRegExp
```

Creates and returns a template tag function that constructs an `ExtRegExp` object from the provided template literal with the provided flags. The template literal is interpreted as a raw string, meaning any escape sequences are left as-is instead of being resolved to their charcter equivalents. The template literal can contain RGX tokens, which will be resolved and concatenated with the literal parts to form the final regex pattern. Before constructing the pattern, any convertible token that defines `rgxAcceptInsertion` is checked; if it returns `false` or a string, an `RGXInsertionRejectedError` is thrown with details about the reason and exactly where the rejection occurred.

When `multiline` is `true` (the default), the literal string parts of the template are processed to strip newlines, trim leading whitespace from each line, and remove empty lines, then joined together. This allows you to write regex patterns across multiple lines in the source code for readability without the newlines and indentation becoming part of the pattern. Only the literal string parts between tokens are affected — interpolated values (tokens) are preserved as-is, including string tokens passed via `${"..."}`. Also, comments (denoted with `//`) ending a line or on a line by themselves are stripped. If a command ends a line, that line is also stripped of whitespace on the right side.

When `multiline` is `false`, all literal string parts are preserved exactly as written, including newlines and whitespace.

When `verbatim` is `true` (the default), the literal string parts of the template are treated as verbatim text to be matched literally: special regex characters (such as `|`, `.`, `*`) are escaped before being inserted into the pattern. When `verbatim` is `false`, literal string parts are inserted as raw regex syntax — special characters are not escaped and work as regex operators. Note that interpolated values (tokens) are always resolved normally regardless of this setting: string tokens via `${"..."}` are always escaped.

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

# rgxa
```typescript
function rgxa(tokens: RGXToken[], flags?: string): ExtRegExp
```
As an alternative to using the `rgx` template tag, you can directly call `rgxa` with an array of RGX tokens and optional flags to get an `ExtRegExp` object. This is useful in cases where you don't want to use a template literal. Like `rgx`, the provided `flags` are passed as `currentFlags` to the resolver, enabling inline modifier groups for `RegExp` literal tokens whose localizable flags differ. Before constructing the pattern, any convertible token in the array that defines `rgxAcceptInsertion` is checked; if it returns `false` or a string, an `RGXInsertionRejectedError` is thrown with details about the reason and exactly where the rejection occurred.

## Parameters
  - `tokens` (`RGXToken[]`): The RGX tokens to be resolved and concatenated to form the regex pattern.
  - `flags` (`string`, optional): The regex flags to apply to the resulting `ExtRegExp` object (e.g., 'g', 'i', 'm', or custom registered flags). If not provided, no flags will be applied. If provided and not valid regex flags (vanilla or registered custom), an `RGXInvalidRegexFlagsError` will be thrown.

## Returns
- `ExtRegExp`: An `ExtRegExp` object constructed from the resolved tokens and the provided flags.

# resolveRGXToken
```typescript
function resolveRGXToken(token: RGXToken, options?: ResolveRGXTokenOptions): ValidRegexString
```

Resolves an RGX token to a string. No-op tokens resolve to an empty string, literal tokens are included as-is (wrapped in a non-capturing group when `groupWrap` is `true`), native tokens are converted to strings and escaped, convertible tokens are converted using their `toRgx` method and then resolved recursively (or, if `rgxInterpolate` is `true`, their `toRgx` result is used as-is without further resolution or escaping), and arrays of tokens are resolved as unions of their resolved elements (repeats removed, placed in a non-capturing group when `groupWrap` is `true`).

For literal tokens (`RegExp` instances), if the token's flags differ from `currentFlags` in any of the localizable flags (`i`, `m`, `s`), the token is wrapped in an inline modifier group (e.g., `(?i:...)`, `(?-i:...)`, `(?ms-i:...)`) instead of a plain non-capturing group. Non-localizable flags (such as `g`, `u`, `y`, `d`, `v`) are ignored when computing the diff. When an inline modifier group is used, it always wraps the token regardless of the `groupWrap` setting, since the modifier group itself serves as a group.

For convertible tokens, if the token has an `rgxGroupWrap` property, that value always takes precedence. If `rgxGroupWrap` is not present, the behavior depends on whether the call is top-level: at the top level, the `groupWrap` option is passed through; in recursive calls, it falls back to `true` regardless of the `groupWrap` option. This ensures that the caller's `groupWrap` preference only affects the outermost convertible token and does not leak into deeply nested resolution.

## Parameters
  - `token` (`RGXToken`): The RGX token to resolve.
  - `options` (`ResolveRGXTokenOptions`, optional): An object containing optional configuration for the resolver.
    - `groupWrap` (`boolean`, optional): Whether to wrap literal tokens and array unions in non-capturing groups (`(?:...)`). Defaults to `true`. When `false`, literals use their raw source and array unions omit the wrapping group. For convertible tokens, the token's `rgxGroupWrap` property always takes precedence; otherwise, this value is only passed through at the top level (in recursive calls it falls back to `true`). Array union elements always use `groupWrap=true` internally. Note that when a literal token requires an inline modifier group due to a localizable flag diff, it is always wrapped regardless of this setting.
    - `topLevel` (`boolean`, optional): Tracks whether the current call is the initial (top-level) invocation. Defaults to `true`. **Warning**: This field is intended for internal use by the resolver's own recursion. External callers should not set this field, as doing so may produce unexpected wrapping behavior.
    - `currentFlags` (`string`, optional): The flags of the current regex context, used to compute inline modifier groups for literal tokens. Defaults to `''`. When a literal token's localizable flags (`i`, `m`, `s`) differ from this value, the resolver wraps the token in an inline modifier group that adds or removes the differing flags locally. If invalid regex flags are provided, an `RGXInvalidRegexFlagsError` will be thrown.

## Returns
- `ValidRegexString`: The resolved string representation of the RGX token. The result is asserted to be a valid regex string before being returned. If the result is invalid for any reason other than an unterminated group, an `RGXInvalidRegexStringError` is thrown. If the result has an unterminated group *and* an `rgxInterpolate` token was resolved, the result is returned as-is rather than throwing — the expectation is that a subsequent token in a concatenation will close the group; if it doesn't, the overall regex construction will catch it.

# rgxConcat
```typescript
function rgxConcat(tokens: RGXToken[], groupWrap?: boolean, currentFlags?: string): ValidRegexString
```
A helper function that resolves an array of RGX tokens and concatenates their resolved string representations together. Before returning, any convertible token in the array that defines `rgxAcceptInsertion` is checked; if it returns `false` or a string, an `RGXInsertionRejectedError` is thrown with details about the reason and exactly where the rejection occurred.

## Parameters
  - `tokens` (`RGXToken[]`): The array of RGX tokens to resolve and concatenate.
  - `groupWrap` (`boolean`, optional): Whether to wrap individual resolved tokens in non-capturing groups. Passed through to `resolveRGXToken`. Defaults to `true`.
  - `currentFlags` (`string`, optional): The flags of the current regex context, passed through to `resolveRGXToken` as its `currentFlags` parameter. Used to compute inline modifier groups for literal tokens whose localizable flags differ. Defaults to `''`. If invalid regex flags are provided, an `RGXInvalidRegexFlagsError` will be thrown.

## Returns
- `ValidRegexString`: The concatenated string representation of the resolved RGX tokens. Each token is resolved via `resolveRGXToken`; invalid regex syntax throws an `RGXInvalidRegexStringError`, except that unterminated groups from `rgxInterpolate` tokens are tolerated (see `resolveRGXToken` returns for details), as a subsequent token in the array may complete the group.