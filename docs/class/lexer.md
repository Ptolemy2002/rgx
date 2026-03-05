# Type Reference
The following is a reference to types relevant to the components listed in this file. The full type reference for the library can be found in [type-reference.md](../type-reference.md).

```typescript
type RGXNoOpToken = null | undefined;
type RGXLiteralToken = RegExp;
type RGXNativeToken = string | number | boolean | RGXNoOpToken;
type RGXConvertibleToken = {
    toRgx: () => RGXToken,
    rgxAcceptInsertion?: (tokens: RGXToken[], flags: ValidRegexFlags) => string | boolean,
    readonly rgxGroupWrap?: boolean,
    readonly rgxIsGroup?: boolean,
    readonly rgxIsRepeatable?: boolean
};
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXToken[];
type RGXTokenOrPart<R, T = unknown> = RGXToken | RGXPart<R, T>;

type RGXWalkerOptions<R> = {
    startingSourcePosition?: number;
    reduced?: R;
    infinite?: boolean;
    looping?: boolean;
};

type LexemeNotMatchedCauseError = RGXRegexNotMatchedAtPositionError | RGXPartValidationFailedError;
type LexemeNotMatchedCause = {
    id: string;
    error: LexemeNotMatchedCauseError;
};

type RGXLexemeLocation = {
    index: number;
    line: number;
    column: number;
};

type RGXLexeme<Data> = {
    id: string;
    raw: string;
    start: RGXLexemeLocation;
    end: RGXLexemeLocation;
    data?: Data;
};

type RGXLexemeDefinition<Data> = Readonly<({
    type: "resolve";
    token: RGXToken;
} | {
    type: "walk";
    tokens: RGXTokenOrPart<Data>[];
    options?: Omit<RGXWalkerOptions<Data>, "startingSourcePosition" | "reduced"> & {
        reduced?: (() => Data) | null;
    };
}) & {
    id: string;
    priority?: number;
}>;

type RGXLexemeDefinitions<Data> = Readonly<Record<string, ReadonlyArray<RGXLexemeDefinition<Data>>>>;
```

# Lexeme Definition
Each `RGXLexemeDefinition<Data>` entry in a mode's array has:
- `id` (`string`): A name for lexemes produced by this definition. Used for identification and by `expectConsume`/`expectPeek`.
- `priority` (`number`, optional): Higher values are tried first within the same mode. Defaults to `0`.
- `type` (`"resolve" | "walk"`): Determines how the lexeme is matched:
  - `"resolve"`: The definition holds a single `token` (`RGXToken`) that is resolved to a regex and matched at the current position. No structured data is attached to the resulting lexeme.
  - `"walk"`: The definition holds an array of `tokens` (`RGXTokenOrPart<Data>[]`) that are matched sequentially by a temporary `RGXWalker`. The walker's `reduced` value at the end of the walk becomes the lexeme's `data`. An `options` object (excluding `startingSourcePosition`) can configure the walker, including a `reduced` factory function (called once per match attempt) to provide a fresh initial value.

# Utilities
## rgxLexemeLocationFromIndex
```typescript
function rgxLexemeLocationFromIndex(source: string, index: number): RGXLexemeLocation
```
Computes the `RGXLexemeLocation` (index, line, and column) for a character position in a source string. Lines and columns are 1-based.

### Parameters
- `source` (`string`): The source string.
- `index` (`number`): The zero-based character index. Must be >= 0 and <= `source.length`, or an `RGXOutOfBoundsError` will be thrown.

### Returns
- `RGXLexemeLocation`: An object with:
  - `index` (`number`): The original zero-based index.
  - `line` (`number`): The 1-based line number (number of `\n` characters before `index`, plus 1).
  - `column` (`number`): The 1-based column number (number of characters since the last `\n`, plus 1).

# RGXLexer\<Data\>
A class that tokenizes a source string into a sequence of `RGXLexeme` objects according to a set of named lexeme definitions grouped by mode. Each mode maps to an ordered list of `RGXLexemeDefinition` entries; the lexer tries them in priority order and uses the first one that matches. When using a `"walk"` definition, a temporary `RGXWalker` is created to match a sequence of tokens — its reduced value becomes the lexeme's `data`. The generic type `Data` is the type of the structured data attached to walk-type lexemes.

A function `rgxLexer` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

## Static Properties
- `check(value: unknown): value is RGXLexer`: A type guard that checks if the given value is an instance of `RGXLexer`.
- `assert(value: unknown): asserts value is RGXLexer`: An assertion that checks if the given value is an instance of `RGXLexer`. If the assertion fails, an `RGXInvalidLexerError` will be thrown.

## Constructor
```typescript
constructor(source: string, lexemeDefinitions?: RGXLexemeDefinitions<Data>, startingPosition?: number)
```
- `source` (`string`): The string to lex.
- `lexemeDefinitions` (`RGXLexemeDefinitions<Data>`, optional): A map from mode name to an ordered array of lexeme definitions. A `"default"` mode is created automatically if not provided. Within each mode, definitions are sorted by `priority` (descending) at construction time, so higher-priority definitions are tried first. Defaults to `{}`.
- `startingPosition` (`number`, optional): The starting index in the source string. Defaults to `0`.

## Properties
- `source` (`string`): The source string being lexed (readonly).
- `position` (`number`): The current index in the source string. Setting this validates that the value is >= 0 and <= `source.length`, throwing `RGXOutOfBoundsError` if not. Non-integer values are floored before being stored.
- `lexemeDefinitions` (`RGXLexemeDefinitions<Data>`): The finalized, priority-sorted map of mode names to lexeme definition arrays (readonly).
- `matched` (`RGXLexeme<Data>[]`): The array of lexemes that have been consumed and logged so far (i.e., produced by `consume` or `expectConsume` with `log` enabled).

## Methods
### validateMode
```typescript
validateMode(value: string): void
```
Asserts that the given mode exists in `lexemeDefinitions`. Throws `RGXInvalidLexerModeError` if not.

### lastMatched
```typescript
lastMatched(): RGXLexeme<Data> | null
```
Returns the last entry in `matched`, or `null` if no lexemes have been logged yet.

### hasNext
```typescript
hasNext(): boolean
```
Returns `true` if the current position is before the end of the source string.

### isAtEnd
```typescript
isAtEnd(): boolean
```
Returns `true` if the current position is at or past the end of the source string. The inverse of `hasNext`.

### remaining
```typescript
remaining(): string
```
Returns the portion of the source string from the current position to the end.

### backtrack
```typescript
backtrack(tokens?: number): void
```
Removes the last `tokens` entries from `matched` and resets `position` to the start index of the earliest removed lexeme. Useful for backtracking after a failed lookahead.

- `tokens` (`number`, optional): The number of previously logged lexemes to undo. Defaults to `1`. Must be <= `matched.length`, or an `RGXOutOfBoundsError` will be thrown.

### consume
```typescript
consume(mode?: string, log?: boolean): RGXLexeme<Data> | null
```
Attempts to match the next lexeme from the source at the current position using the given mode. On a successful match, advances `position` and, when `log` is `true`, appends the lexeme to `matched`. Returns `null` if the source is fully consumed. Throws `RGXLexemeNotMatchedAtPositionError` if no definition matches.

- `mode` (`string`, optional): The lexer mode to use. Defaults to `"default"`.
- `log` (`boolean`, optional): Whether to append the matched lexeme to `matched`. Defaults to `true`.

### peek
```typescript
peek(mode?: string): RGXLexeme<Data> | null
```
Same as `consume`, but does not advance `position` and never logs to `matched`. Useful for lookahead without consuming input.

- `mode` (`string`, optional): The lexer mode to use. Defaults to `"default"`.

### expectConsume
```typescript
expectConsume(id: string, mode?: string, log?: boolean): RGXLexeme<Data>
```
Consumes the next lexeme and asserts that it has the given `id`. Throws `RGXLexemeNotMatchedAtPositionError` if the source is exhausted or if the matched lexeme's `id` does not equal the expected `id`.

- `id` (`string`): The expected lexeme id.
- `mode` (`string`, optional): The lexer mode to use. Defaults to `"default"`.
- `log` (`boolean`, optional): Whether to log the matched lexeme to `matched`. Defaults to `true`.

### expectPeek
```typescript
expectPeek(id: string, mode?: string): RGXLexeme<Data>
```
Peeks at the next lexeme and asserts that it has the given `id`, without advancing position. Throws `RGXLexemeNotMatchedAtPositionError` if the source is exhausted or if the peeked lexeme's `id` does not match.

- `id` (`string`): The expected lexeme id.
- `mode` (`string`, optional): The lexer mode to use. Defaults to `"default"`.

### skip
```typescript
skip(count?: number, mode?: string): void
```
Consumes and discards the next `count` lexemes without logging them. Stops early if the source is exhausted.

- `count` (`number`, optional): The number of lexemes to skip. Defaults to `1`.
- `mode` (`string`, optional): The lexer mode to use. Defaults to `"default"`.

### skipWhitespace
```typescript
skipWhitespace(): void
```
Advances `position` past any leading whitespace at the current position, using the built-in `"whitespace-block"` constant (`\s+`). Does nothing if already at the end of the source.

### consumeAll
```typescript
consumeAll(mode?: string, skipWhitespace?: boolean): RGXLexeme<Data>[]
```
Consumes and logs all remaining lexemes in the source, returning them as an array. Optionally skips whitespace before each lexeme.

- `mode` (`string`, optional): The lexer mode to use. Defaults to `"default"`.
- `skipWhitespace` (`boolean`, optional): Whether to call `skipWhitespace()` before each `consume`. Defaults to `true`.

### consumeWhile
```typescript
consumeWhile(predicate: (lexeme: RGXLexeme<Data>) => boolean, mode?: string, skipWhitespace?: boolean): RGXLexeme<Data>[]
```
Consumes and logs lexemes as long as the given predicate returns `true`, stopping when it returns `false` or the source is exhausted. The lexeme that fails the predicate is consumed but not included in the result.

- `predicate` (`(lexeme: RGXLexeme<Data>) => boolean`): The condition to check after each match.
- `mode` (`string`, optional): The lexer mode to use. Defaults to `"default"`.
- `skipWhitespace` (`boolean`, optional): Whether to call `skipWhitespace()` before each `consume`. Defaults to `true`.

### consumeUntil
```typescript
consumeUntil(predicate: (lexeme: RGXLexeme<Data>) => boolean, mode?: string, skipWhitespace?: boolean): RGXLexeme<Data>[]
```
Consumes and logs lexemes until the given predicate returns `true`, stopping when it does or the source is exhausted. Equivalent to `consumeWhile` with the predicate negated. The lexeme that satisfies the predicate is consumed but not included in the result.

- `predicate` (`(lexeme: RGXLexeme<Data>) => boolean`): The stop condition.
- `mode` (`string`, optional): The lexer mode to use. Defaults to `"default"`.
- `skipWhitespace` (`boolean`, optional): Whether to call `skipWhitespace()` before each `consume`. Defaults to `true`.
