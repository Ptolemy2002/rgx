# Type Reference
The following is a reference to types relevant to the class listed in this file. The full type reference for the library can be found in [type-reference.md](../../type-reference.md).

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
type RGXJSONLiteralToken = { $rgx: true, source: string, flags?: string, patternTransformers?: string[] };
type RGXJSONClassToken = { $rgx: true, class: string, args?: RGXJSONValue[] };
type RGXJSONInterpolationToken = { $rgx: true, interpolation: string };
type RGXJSONObjectToken = RGXJSONLiteralToken | RGXJSONClassToken | RGXJSONInterpolationToken;
type RGXJSONToken = RGXJSONNativeToken | RGXJSONObjectToken | RGXJSONToken[];
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXInterpolationToken | RGXJSONObjectToken | RGXToken[];


type RGXUnionInsertionPosition = 'prefix' | 'suffix';
```

# RGXClassUnionToken
A class representing a union (alternation) of RGX tokens. This is typically created via the `or()` method on `RGXClassToken`, but can also be instantiated directly.

A function `rgxClassUnion` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

## Static Properties
- `check(value: unknown): value is RGXClassUnionToken`: A type guard that checks if the given value is an instance of `RGXClassUnionToken`.
- `assert(value: unknown): asserts value is RGXClassUnionToken`: An assertion that checks if the given value is an instance of `RGXClassUnionToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.
- `fromJSON(json: RGXJSONClassToken): RGXClassUnionToken`: Constructs an `RGXClassUnionToken` from a JSON class token, passing `rgxTokenFromJSON(tokens)` (or `[]` when omitted) to the constructor. Throws `RGXInvalidJSONTokenError` if `json` is not a JSON class token for `"RGXClassUnionToken"`, and `RGXJSONClassArgsValidationFailedError` if the arguments are invalid. The JSON arguments are `[tokens?]`, where `tokens`, if present, must be a JSON token (typically an array of JSON tokens). Nested JSON tokens only have their shape checked here, since converting them validates their contents (throwing the corresponding error).

## Constructor
```typescript
constructor(tokens: RGXToken = [])
```
- `tokens` (`RGXToken`, optional): The alternatives of the union. An array, or another `RGXClassUnionToken`, lists the alternatives; any other token is a single alternative. Nested arrays and unions are expanded and duplicates are removed (see `cleanTokens()`). Defaults to an empty array.

## Properties
- `tokens` (`RGXToken[]`): The alternatives of the union.

## Methods
- `add(token: RGXToken, pos?: RGXUnionInsertionPosition) => this`: Adds a token to the union. Arrays and `RGXClassUnionToken` instances add each of their alternatives. The `pos` parameter controls where the token is inserted: `'prefix'` inserts at the beginning, `'suffix'` (default) appends to the end. Returns `this` for chaining.
- `concat(pos?: RGXUnionInsertionPosition, ...others: RGXToken[]) => this`: Concatenates additional tokens into the union. The `pos` parameter controls insertion position: `'suffix'` (default) appends to the end, `'prefix'` prepends to the beginning. Returns `this` for chaining.
- `cleanTokens() => this`: Expands any nested union tokens and removes duplicates from `tokens`. Returns `this` for chaining. Called automatically during construction and after `add` or `concat`.
- `toRgx(currentFlags?: string) => RegExp`: Resolves the alternatives as a union (the same way as an array token), returning a `RegExp`. `currentFlags` (`string`, optional, defaults to `''`) is the flags in effect where the token is placed, including those set by enclosing flag-modifier groups; the tokens inside are resolved with it, and the returned `RegExp` carries its localizable and unicode flags, so resolving the result in that context leaves those flags alone.
- `clone(depth: CloneDepth = "max") => ThisType<this>`: Creates a clone of this instance to a specified depth: `0` for no clone, `1` for a shallow clone of the top-level token, any other number for that many levels down, and `"max"` (the default) for a full deep clone.
- `toJSON() => RGXJSONClassToken`: Returns a JSON class token with `class` set to `"RGXClassUnionToken"` and `args` set to `[tokens]`, where `tokens` is the array of this union's tokens converted with `rgxTokenToJSON`. The result is accepted by `fromJSON` and by `rgxTokenFromJSON` (see [../../json.md](../../json.md)). Nested tokens are converted with `rgxTokenToJSON`, so plain convertible tokens inside this token are resolved into JSON literal tokens.

# Functions
## expandRgxUnionTokens
```typescript
function expandRgxUnionTokens(...tokens: RGXToken[]): RGXToken[]
```

Recursively expands nested union tokens (arrays and `RGXClassUnionToken` instances) into a flat array. This is useful for normalizing a set of union alternatives before deduplication.

## Parameters
  - `tokens` (`...RGXToken[]`): The tokens to expand.

## Returns
- `RGXToken[]`: A flat array containing all expanded tokens.

# removeRgxUnionDuplicates
```typescript
function removeRgxUnionDuplicates(...tokens: RGXToken[]): RGXToken[]
```
Removes duplicate tokens from the provided list using `Set` equality and returns a new array containing only the unique tokens, in order. `RegExp` tokens are compared by their string form (source and flags), and JSON object tokens are compared by their `JSON.stringify` form, since neither would otherwise be considered equal.

## Parameters
  - `tokens` (`...RGXToken[]`): The tokens to deduplicate.

## Returns
- `RGXToken[]`: The tokens with duplicates removed.