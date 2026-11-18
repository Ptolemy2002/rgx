# Type Reference
The following is a reference to types relevant to the components listed in this file. The full type reference for the library can be found in [type-reference.md](../../type-reference.md).

```typescript
type RGXCapture<T = unknown> = {
    raw: string;
    value: T;
    start: number;
    end: number;
    ownerId: string | null;
    branch: number;
    groups: Record<string, string> | null;
};
type RGXTokenParseOptions = {
    flags?: string;
    matched?: boolean;
};
// RGXClassToken is documented in base.md.
interface RGXParsableToken<T = unknown> extends RGXClassToken {
    parse(text: string, options?: RGXTokenParseOptions): RGXCapture<T>[];
    matchesWhole(text: string, flags?: string): boolean;
}
```

# RGXParsableToken\<T = unknown\>
An interface for class tokens that resolve to a pattern without capture groups for their pieces, and read those pieces out of the text they matched with a parse pass of their own. `RGXListToken` (see [list.md](./list.md)) and `RGXPermutationToken` (see [permutation.md](./permutation.md)) implement it, and custom class tokens can too. Code that only needs to parse can accept any of them:

```typescript
function values(token: RGXParsableToken, text: string, flags = "") {
    if (!token.matchesWhole(text, flags)) return null;
    return token.parse(text, { flags, matched: true }).map(item => item.value);
}
```

## Methods
- `parse(text: string, options?: RGXTokenParseOptions) => RGXCapture<T>[]`: Walks `text`, which should be text the token matched, and returns a capture for each piece of it. `options.flags` (`string`, optional) is the flags the token is matched with, since a walker matches without flags; only the localizable flags (`i`, `m` and `s`) are used. `options.matched` (`boolean`, optional) says that `text` is already known to be a match of the token, which skips checking it against the token's pattern. `RGXListToken` doesn't check its text yet, so it ignores `matched` (see [PENDING_BREAKING_CHANGES.md](../../../PENDING_BREAKING_CHANGES.md)).
- `matchesWhole(text: string, flags?: string) => boolean`: Whether the token's pattern, with the localizable flags of `flags` (defaults to `""`), matches all of `text`.

# isRGXParsableToken
```typescript
function isRGXParsableToken<T = unknown>(value: unknown): value is RGXParsableToken<T>
```
Checks whether a value is a parsable token: an `RGXClassToken` with `parse` and `matchesWhole` methods. The methods are only checked to exist, not called.

## Parameters
  - `value` (`unknown`): The value to check.

## Returns
- `boolean`: Whether `value` is an `RGXParsableToken`.

# assertRGXParsableToken
```typescript
function assertRGXParsableToken<T = unknown>(value: unknown): asserts value is RGXParsableToken<T>
```
Asserts that a value is a parsable token, as checked by `isRGXParsableToken`, throwing an `RGXInvalidTokenError` if it isn't.

## Parameters
  - `value` (`unknown`): The value to check.
