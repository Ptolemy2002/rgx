# Type Reference
The following is a reference to types relevant to the class listed in this file. The full type reference for the library can be found in [type-reference.md](../type-reference.md).

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
    readonly rgxIsRepeatable?: boolean
};
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXToken[];

type RGXTokenCollectionMode = 'union' | 'concat';
type RGXTokenCollectionInput = RGXToken | RGXTokenCollection;
```

# RGXTokenCollection
A class representing a collection of RGX tokens. This class manages collections of RGX tokens like an array, but with additional metadata about the collection mode (union or concat). Since `toRgx()` returns a `RegExp`, instances of this class satisfy the `RGXConvertibleToken` interface and can be used directly as tokens in `rgx`, `rgxa`, and other token-accepting functions.

A function `rgxTokenCollection` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

## Static Properties
- `check(value: unknown): value is RGXTokenCollection`: A type guard that checks if the given value is an instance of `RGXTokenCollection`.
- `assert(value: unknown): asserts value is RGXTokenCollection`: An assertion that checks if the given value is an instance of `RGXTokenCollection`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

## Constructor
```typescript
constructor(tokens: RGXTokenCollectionInput = [], mode: RGXTokenCollectionMode = 'concat')
```
- `tokens` (`RGXTokenCollectionInput`, optional): The tokens to be managed by the collection. This can be an array of RGX tokens, a single RGX token (which will be wrapped in an array), or another `RGXTokenCollection` (whose tokens will be copied). Defaults to an empty array.
- `mode` (`RGXTokenCollectionMode`, optional): The mode of the collection, either 'union' or 'concat'. Defaults to 'concat'.

## Properties
- `tokens` (`RGXToken[]`): The array of RGX tokens managed by the collection. In almost all cases, use `getTokens()` instead of accessing this property directly, as it will be copied to prevent external mutation.
- `mode` (`RGXTokenCollectionMode`): The mode of the collection, either 'union' or 'concat'. This determines how the tokens in the collection will be resolved when `toRgx()` is called.
- `resolve() => ValidRegexString`: A convenience method that resolves this collection by calling `resolveRGXToken(this)`, returning the resolved regex string representation.
- `toRgx() => RegExp`: A method that resolves the collection to a `RegExp` object based on the collection mode. In 'union' mode, the tokens are resolved as alternatives (using the `|` operator), while in 'concat' mode, the tokens are resolved as concatenated together. No flags are applied to the resulting `RegExp`. Since this method returns a `RegExp` (which is `RGXLiteralToken`), `RGXTokenCollection` instances satisfy the `RGXConvertibleToken` interface and can be used directly as tokens in `rgx`, `rgxa`, and other token-accepting functions.
- `getTokens() => RGXToken[]`: A method that returns a copy of the array of RGX tokens managed by the collection. This is used to prevent external mutation of the internal `tokens` array.
- `toArray() => RGXToken[]`: An alias for `getTokens()`, provided for convenience.
- `clone(depth: CloneDepth = "max") => RGXTokenCollection`: A method that creates and returns a deep clone of the RGXTokenCollection instance. This is useful for creating a new collection with the same tokens and mode without affecting the original collection. The `depth` parameter controls how deeply nested collections are cloned: `0` for no clone, `1` for a shallow clone of the top-level collection, any other number for that many levels down, and `"max"` (the default) for a full deep clone.
- `asConcat() => RGXTokenCollection`: If this collection is in 'union' mode, this method returns a new RGXTokenCollection instance with the same tokens but in 'concat' mode. If the collection is already in 'concat' mode, it simply returns itself.
- `asUnion() => RGXTokenCollection`: If this collection is in 'concat' mode, this method returns a new RGXTokenCollection instance with the same tokens but in 'union' mode. If the collection is already in 'union' mode, it simply returns itself.

Standard array properties and methods like `length`, `push`, `pop`, etc. are implemented to work with the internal `tokens` array, but providing collection instances instead of raw arrays when relevant (e.g., `map` has the third parameter typed as `RGXTokenCollection` instead of `RGXToken[]`).