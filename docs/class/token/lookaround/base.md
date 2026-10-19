# Type Reference
The following is a reference to types relevant to the class listed in this file. The full type reference for the library can be found in [type-reference.md](../../../type-reference.md).

```typescript
import { CloneDepth } from "@ptolemy2002/immutability-utils";
// type CloneDepth = number | "max";

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

```

# RGXLookaroundToken (abstract)
An abstract base class for lookaround assertion tokens (lookahead and lookbehind). Lookaround assertions match a pattern without consuming characters in the string. Subclasses must implement the `toRgx()`, `clone(depth?: CloneDepth)`, `negate()`, and `reverse()` methods.

## Static Properties
- `check(value: unknown): value is RGXLookaroundToken`: A type guard that checks if the given value is an instance of `RGXLookaroundToken`.
- `assert(value: unknown): asserts value is RGXLookaroundToken`: An assertion that checks if the given value is an instance of `RGXLookaroundToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

## Constructor
```typescript
constructor(tokens?: RGXToken, positive?: boolean)
```
- `tokens` (`RGXToken`, optional): The tokens to include in the lookaround, which are concatenated. An array lists the tokens (it is copied); any other token, including an `RGXClassUnionToken`, is the lookaround's only token. Defaults to an empty array.
- `positive` (`boolean`, optional): Whether the lookaround is positive (matches if the pattern is present) or negative (matches if the pattern is absent). Defaults to `true`.

## Properties
- `tokens` (`RGXToken[]`): The tokens inside the lookaround, which are concatenated.
- `positive` (`boolean`): Whether the lookaround is positive. Setting this updates `negative` accordingly.
- `negative` (`boolean`): Whether the lookaround is negative. Setting this updates `positive` accordingly.

These properties only have getters.
- `rgxIsRepeatable` (`undefined`): Not set, since lookaround assertions are detected as consuming no characters, which makes them non-repeatable.

## Abstract Methods
- `negate() => RGXLookaroundToken`: Returns a new lookaround token of the same type with the opposite positivity, preserving the original tokens.
- `reverse() => RGXLookaroundToken`: Returns a new lookaround token of the opposite direction (lookahead becomes lookbehind and vice versa), preserving the original tokens and positivity.
- `clone(depth?: CloneDepth) => RGXLookaroundToken`: Creates a clone of this instance to a specified depth: `0` for no clone, `1` for a shallow clone of the top-level token, any other number for that many levels down, and `"max"` (the default) for a full deep clone.
