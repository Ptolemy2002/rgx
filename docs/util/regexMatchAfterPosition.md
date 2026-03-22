# Type Reference
The following is a reference to types relevant to the functions listed in this file. The full type reference for the library can be found in [type-reference.md](../type-reference.md).

```typescript
```

# regexMatchAfterPosition
```typescript
function regexMatchAfterPosition(regex: RegExp, str: string, position: number, includeMatch: true): [number, RegExpExecArray] | null
function regexMatchAfterPosition(regex: RegExp, str: string, position: number, includeMatch?: false): [number, string] | null
```
Searches for the first match of the given regular expression at or after the specified position in the string. This is done by creating a global (`g` flag) copy of the regex, setting its `lastIndex` to the desired position, and calling `exec`. The position must be >= 0 and < the string length, or an `RGXOutOfBoundsError` will be thrown. When a match is found, returns a tuple of the match's start index and either the matched string or the full `RegExpExecArray`.

## Parameters
  - `regex` (`RegExp`): The regular expression to match.
  - `str` (`string`): The string to search.
  - `position` (`number`): The zero-based index from which to begin searching. Must be >= 0 and < `str.length`.
  - `includeMatch` (`boolean`, optional): When `true`, returns the full `RegExpExecArray` instead of just the matched string. Defaults to `false`.

## Returns
- `[number, string] | null`: When `includeMatch` is `false` (default): a tuple of `[startIndex, matchedString]` if a match is found at or after the position, otherwise `null`.
- `[number, RegExpExecArray] | null`: When `includeMatch` is `true`: a tuple of `[startIndex, matchArray]` if a match is found, otherwise `null`.

# doesRegexMatchAfterPosition
```typescript
function doesRegexMatchAfterPosition(regex: RegExp, str: string, position: number, includeMatch: true): [number, RegExpExecArray] | false
function doesRegexMatchAfterPosition(regex: RegExp, str: string, position: number, includeMatch?: false): boolean
```
Tests whether the given regular expression matches anywhere at or after the specified position in the string.

## Parameters
  - `regex` (`RegExp`): The regular expression to test.
  - `str` (`string`): The string to search.
  - `position` (`number`): The zero-based index from which to begin searching. Must be >= 0 and < `str.length`.
  - `includeMatch` (`boolean`, optional): When `true`, returns the match tuple on success instead of `true`. Defaults to `false`.

## Returns
- `boolean`: When `includeMatch` is `false` (default): `true` if the regex matches at or after the position, otherwise `false`.
- `[number, RegExpExecArray] | false`: When `includeMatch` is `true`: a tuple of `[startIndex, matchArray]` if the regex matches, otherwise `false`.

# assertRegexMatchesAfterPosition
```typescript
function assertRegexMatchesAfterPosition(regex: RegExp, str: string, position: number, contextSize?: number | null, includeMatch?: false): [number, string]
function assertRegexMatchesAfterPosition(regex: RegExp, str: string, position: number, contextSize: number | null | undefined, includeMatch: true): [number, RegExpExecArray]
```
Asserts that the given regular expression matches somewhere at or after the specified position in the string, throwing an `RGXRegexNotMatchedAfterPositionError` if it does not. On success, returns a tuple of the match's start index and the matched string or full match array depending on `includeMatch`.

## Parameters
  - `regex` (`RegExp`): The regular expression to match.
  - `str` (`string`): The string to search.
  - `position` (`number`): The zero-based index from which to begin searching. Must be >= 0 and < `str.length`.
  - `contextSize` (`number | null`, optional): The number of characters on each side of the position to include in the error's context output. Defaults to `10`.
  - `includeMatch` (`boolean`, optional): When `true`, returns the full `RegExpExecArray` instead of just the matched string. Defaults to `false`.

## Returns
- `[number, string]`: When `includeMatch` is `false` (default): a tuple of `[startIndex, matchedString]`. Throws `RGXRegexNotMatchedAfterPositionError` if there is no match.
- `[number, RegExpExecArray]`: When `includeMatch` is `true`: a tuple of `[startIndex, matchArray]`. Throws `RGXRegexNotMatchedAfterPositionError` if there is no match.
