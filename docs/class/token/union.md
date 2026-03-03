# Type Reference
The following is a reference to types relevant to the class listed in this file. The full type reference for the library can be found in [type-reference.md](../../type-reference.md).

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

type RGXTokenCollectionInput = RGXToken | RGXTokenCollection;

type RGXUnionInsertionPosition = 'prefix' | 'suffix';
```

# RGXClassUnionToken
A class representing a union (alternation) of RGX tokens. This is typically created via the `or()` method on `RGXClassToken`, but can also be instantiated directly.

A function `rgxClassUnion` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

## Static Properties
- `check(value: unknown): value is RGXClassUnionToken`: A type guard that checks if the given value is an instance of `RGXClassUnionToken`.
- `assert(value: unknown): asserts value is RGXClassUnionToken`: An assertion that checks if the given value is an instance of `RGXClassUnionToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.

## Constructor
```typescript
constructor(tokens: RGXTokenCollectionInput = [])
```
- `tokens` (`RGXTokenCollectionInput`, optional): The tokens to include in the union. Internally stored as an `RGXTokenCollection` in 'union' mode. Defaults to an empty array.

## Properties
- `tokens` (`RGXTokenCollection`): The internal collection of tokens managed in 'union' mode.

## Methods
- `add(token: RGXToken, pos?: RGXUnionInsertionPosition) => this`: Adds a token to the union. The `pos` parameter controls where the token is inserted: `'prefix'` inserts at the beginning, `'suffix'` (default) appends to the end. Returns `this` for chaining.
- `concat(pos?: RGXUnionInsertionPosition, ...others: RGXTokenCollectionInput[]) => this`: Concatenates additional tokens into the union. The `pos` parameter controls insertion position: `'suffix'` (default) appends to the end, `'prefix'` prepends to the beginning. Returns `this` for chaining.
- `cleanTokens() => this`: Expands any nested union tokens and removes duplicates from the internal token collection. Returns `this` for chaining. Called automatically during construction and after `add` or `concat`.
- `toRgx() => RegExp`: Resolves the union by calling `toRgx()` on the internal `RGXTokenCollection`, returning a `RegExp`.
- `clone(depth: CloneDepth = "max") => ThisType<this>`: Creates a clone of this instance to a specified depth: `0` for no clone, `1` for a shallow clone of the top-level token, any other number for that many levels down, and `"max"` (the default) for a full deep clone.

# Functions
## expandRgxUnionTokens
```typescript
function expandRgxUnionTokens(...tokens: RGXTokenCollectionInput[]): RGXTokenCollection
```

Recursively expands nested union tokens (arrays, `RGXTokenCollection` instances in union mode, and `RGXClassUnionToken` instances) into a flat `RGXTokenCollection`. This is useful for normalizing a set of union alternatives before deduplication.

## Parameters
  - `tokens` (`...RGXTokenCollectionInput[]`): The tokens to expand.

## Returns
- `RGXTokenCollection`: A flat collection containing all expanded tokens.

# removeRgxUnionDuplicates
```typescript
function removeRgxUnionDuplicates(...tokens: RGXTokenCollectionInput[]): RGXTokenCollection
```
Removes duplicate tokens from the provided list using `Set` equality and returns a new `RGXTokenCollection` in union mode containing only the unique tokens.

## Parameters
  - `tokens` (`...RGXTokenCollectionInput[]`): The tokens to deduplicate.

## Returns
- `RGXTokenCollection`: A union-mode collection with duplicates removed.