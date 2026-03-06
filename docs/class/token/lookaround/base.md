# Type Reference
The following is a reference to types relevant to the class listed in this file. The full type reference for the library can be found in [type-reference.md](../../../type-reference.md).

```typescript
import { CloneDepth } from "@ptolemy2002/immutability-utils";
// type CloneDepth = number | "max";

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

type RGXTokenCollectionInput = RGXToken | RGXTokenCollection;
```

# RGXLookaroundToken (abstract)
An abstract base class for lookaround assertion tokens (lookahead and lookbehind). Lookaround assertions match a pattern without consuming characters in the string. Subclasses must implement the `toRgx()`, `clone(depth?: CloneDepth)`, `negate()`, and `reverse()` methods.

## Static Properties
- `check(value: unknown): value is RGXLookaroundToken`: A type guard that checks if the given value is an instance of `RGXLookaroundToken`.
- `assert(value: unknown): asserts value is RGXLookaroundToken`: An assertion that checks if the given value is an instance of `RGXLookaroundToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

## Constructor
```typescript
constructor(tokens?: RGXTokenCollectionInput, positive?: boolean)
```
- `tokens` (`RGXTokenCollectionInput`, optional): The tokens to include in the lookaround. Internally stored as an `RGXTokenCollection` in 'concat' mode. Defaults to an empty array.
- `positive` (`boolean`, optional): Whether the lookaround is positive (matches if the pattern is present) or negative (matches if the pattern is absent). Defaults to `true`.

## Properties
- `tokens` (`RGXTokenCollection`): The internal collection of tokens managed in 'concat' mode.
- `positive` (`boolean`): Whether the lookaround is positive. Setting this updates `negative` accordingly.
- `negative` (`boolean`): Whether the lookaround is negative. Setting this updates `positive` accordingly.

These properties only have getters.
- `rgxIsGroup` (`true`): Returns `true` as a constant, indicating this token represents a group.
- `rgxIsRepeatable` (`false`): Returns `false` as a constant, since lookaround assertions cannot be repeated.
- `rgxGroupWrap` (`false`): Returns `false` as a constant, since the lookaround already wraps itself in a group.

## Abstract Methods
- `negate() => RGXLookaroundToken`: Returns a new lookaround token of the same type with the opposite positivity, preserving the original tokens.
- `reverse() => RGXLookaroundToken`: Returns a new lookaround token of the opposite direction (lookahead becomes lookbehind and vice versa), preserving the original tokens and positivity.
- `clone(depth?: CloneDepth) => RGXLookaroundToken`: Creates a clone of this instance to a specified depth: `0` for no clone, `1` for a shallow clone of the top-level token, any other number for that many levels down, and `"max"` (the default) for a full deep clone.