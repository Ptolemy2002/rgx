# regexMatchAtPosition
```typescript
function regexMatchAtPosition(regex: RegExp, str: string, position: number, includeMatch: true): RegExpExecArray | null
function regexMatchAtPosition(regex: RegExp, str: string, position: number, includeMatch?: false): string | null
```
Attempts to match the given regular expression at a specific position in the string. This is done by creating a sticky (`y` flag) copy of the regex and setting its `lastIndex` to the desired position. The position must be within the bounds of the string (>= 0 and < string length), or an `RGXOutOfBoundsError` will be thrown.

## Parameters
  - `regex` (`RegExp`): The regular expression to match.
  - `str` (`string`): The string to match against.
  - `position` (`number`): The zero-based index in the string at which to attempt the match. Must be >= 0 and < `str.length`.
  - `includeMatch` (`boolean`, optional): When `true`, returns the full `RegExpExecArray` instead of just the matched string. Defaults to `false`.

## Returns
- `string | null`: When `includeMatch` is `false` (default): the matched string if the regex matches at the specified position, otherwise `null`.
- `RegExpExecArray | null`: When `includeMatch` is `true`: the full match array if the regex matches, otherwise `null`.

# doesRegexMatchAtPosition
```typescript
function doesRegexMatchAtPosition(regex: RegExp, str: string, position: number, includeMatch: true): RegExpExecArray | false
function doesRegexMatchAtPosition(regex: RegExp, str: string, position: number, includeMatch?: false): boolean
```

Tests whether the given regular expression matches at a specific position in the string.

## Parameters
  - `regex` (`RegExp`): The regular expression to test.
  - `str` (`string`): The string to test against.
  - `position` (`number`): The zero-based index in the string at which to test the match. Must be >= 0 and < `str.length`.
  - `includeMatch` (`boolean`, optional): When `true`, returns the full `RegExpExecArray` on a match instead of `true`. Defaults to `false`.

## Returns
- `boolean`: When `includeMatch` is `false` (default): `true` if the regex matches at the specified position, otherwise `false`.
- `RegExpExecArray | false`: When `includeMatch` is `true`: the full match array if the regex matches, otherwise `false`.

# assertRegexMatchesAtPosition
```typescript
function assertRegexMatchesAtPosition(regex: RegExp, str: string, position: number, contextSize?: number | null, includeMatch?: false): string
function assertRegexMatchesAtPosition(regex: RegExp, str: string, position: number, contextSize: number | null | undefined, includeMatch: true): RegExpExecArray
```
Asserts that the given regular expression matches at a specific position in the string, throwing an `RGXRegexNotMatchedAtPositionError` if it does not. On success, returns the matched string or full match array depending on `includeMatch`.

## Parameters
  - `regex` (`RegExp`): The regular expression to match.
  - `str` (`string`): The string to match against.
  - `position` (`number`): The zero-based index in the string at which to assert the match. Must be >= 0 and < `str.length`.
  - `contextSize` (`number | null`, optional): The number of characters on each side of the position to include in the error's context output. Defaults to `10`.
  - `includeMatch` (`boolean`, optional): When `true`, returns the full `RegExpExecArray` instead of just the matched string. Defaults to `false`.

## Returns
- `string`: When `includeMatch` is `false` (default): the matched string. Throws `RGXRegexNotMatchedAtPositionError` if there is no match.
- `RegExpExecArray`: When `includeMatch` is `true`: the full match array. Throws `RGXRegexNotMatchedAtPositionError` if there is no match.