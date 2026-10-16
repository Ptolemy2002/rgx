# Type Reference
The following is a reference to types relevant to the function listed in this file. The full type reference for the library can be found in [type-reference.md](./type-reference.md).

```typescript
type RGXNoOpToken = null | undefined;
type RGXLiteralToken = RegExp;
type RGXNativeToken = string | number | boolean | RGXNoOpToken;
type RGXInterpolationToken = { readonly rgxInterpolation: string };
```

# rgxParse
```typescript
function rgxParse(pattern: RegExp | string, flags?: string): RGXClassToken
```
Converts a regular expression into the equivalent tree of tokens, so a pattern written as a regex (by hand, or by a third party) can be inspected and changed with the class token API. Resolving the result with the same flags gives a pattern that matches the same strings, with the same captures, as the original.

Constructs with a matching token class become instances of that class:

| Regex construct | Token |
| --- | --- |
| `(...)`, `(?<name>...)` | `RGXGroupToken` with `capturing` set to `true` and the name, if any |
| `(?i:...)`, `(?i-m:...)` | Non-capturing `RGXGroupToken` whose `flags` are the localizable flags in effect inside the group (see below) |
| `x*`, `x+?`, `x{2,5}`, `x??` | `RGXRepeatToken` with the matching `min`, `max` (`null` when unbounded) and `lazy` |
| `a\|b` | `RGXClassUnionToken` with one member per alternative (`null` for an empty alternative) |
| `(?=...)`, `(?!...)` | `RGXLookaheadToken` with the matching `positive` |
| `(?<=...)`, `(?<!...)` | `RGXLookbehindToken` with the matching `positive` |
| `\1`, `\k<name>` | `RGXSubpatternToken` |

The rest becomes simpler tokens:
- Runs of plain characters become strings, such as `"abc"`. Strings take on the flags of wherever they are placed, so while the `i` flag is in effect, a run containing characters it affects (letters, and anything outside ASCII) becomes a literal token with the `i` flag instead. The characters in these literal tokens are written by value (such as `\u0001`), so they read the same wherever the token is placed.
- Everything else, such as character classes, escapes like `\d` and `\p{L}`, `.`, `^`, `$` and `\b`, becomes a literal token (a `RegExp`) with the same source.
- Non-capturing groups without flags are only syntax, so they don't become tokens of their own. Their contents become the tokens described here, nested the same way (for example, `(?:ab)+` becomes an `RGXRepeatToken` of `"ab"`, and `(?:a|b)` becomes an `RGXClassUnionToken`).
- A sequence of several tokens (inside a group, an alternative, or at the top level) becomes an `RGXTokenCollection` in `concat` mode.

The result is always a class token: the top level is converted with `toRGXClassToken` (see [to.md](./class/token/to.md)), so a sequence becomes a non-capturing `RGXGroupToken` and a lone string or literal token becomes an `RGXClassWrapperToken`.

Literal tokens carry the localizable flags (`i`, `m`, `s`) in effect where they were, including those set by enclosing flag-modifier groups, plus `u` or `v` if the pattern had one. So they match the same wherever they are placed, and placing them where those flags are in effect adds nothing to the pattern. When the pattern has any of the `i`, `m` or `s` flags, the whole result is also wrapped in a non-capturing `RGXGroupToken` that sets them, so it keeps matching the same when placed into a pattern with different localizable flags. Otherwise, it inherits them from where it is placed, like any other token.

A few constructs can't be represented by class tokens yet, and are kept as interpolation tokens (see [general.md](./general.md)) around the converted contents:
- A flag-modifier group that turns off every localizable flag in effect (such as `(?-i:a)` in a pattern with only the `i` flag), since an `RGXGroupToken` with empty `flags` sets no flags instead. If no localizable flags were in effect, the group changes nothing and is dropped.
- A quantifier that allows no repetitions on an assertion, or on a group made entirely of assertions (such as `(?=a)*` or `(?:(?<=a))?`), since `RGXRepeatToken` refuses tokens that consume no characters. The element is wrapped in `(?:` and `)` followed by the quantifier. It never takes part in the match, but it is kept, since capture groups inside it still count. A quantifier that requires at least one repetition (such as `(?=a)+` or `(?:(?<=a)){2}`) is dropped instead, and the element is converted on its own, since repeating something that consumes nothing at the same position changes nothing.

Only the built-in classes in the table above are recognized. Patterns produced by other class tokens (such as `RGXExclusionToken`, constants, or your own classes) come back as the tokens they are made of, which match the same but don't have the original class's API. To store or send tokens without losing their classes, use their JSON form (see [json.md](./json.md)) instead of their resolved regex.

Throws `RGXInvalidRegexStringError` if `pattern` is not a valid regex with the given flags, `RGXInvalidVanillaRegexFlagsError` if the flags are invalid, and `RGXNotSupportedError` if the flags include a custom flag (see [ExtRegExp.md](./ExtRegExp.md)), since flag transformers change the source in ways that can't be undone.

## Parameters
  - `pattern` (`RegExp | string`): The regex to convert, or its source.
  - `flags` (`string`, optional): The flags the source is read with. They decide how some syntax is read (for example, `\p{L}` is a property escape with the `u` or `v` flag, and a `p` followed by `{L}` without them) and which localizable flags are in effect. Defaults to the flags of `pattern` when it is a `RegExp`, and `''` when it is a string.

## Returns
- `RGXClassToken`: The root of the token tree, as described above.

```typescript
const token = rgxParse(/(?<year>\d{4})-(?<month>\d{2})/) as RGXGroupToken;
// A non-capturing RGXGroupToken containing the two named groups and "-".
const year = token.tokens.at(0) as RGXGroupToken;
year.name = "y";
rgxa([token]); // /(?<y>\d{4})\x2d(?<month>\d{2})/
```
