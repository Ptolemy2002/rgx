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
type RGXJSONLiteralToken = { $rgx: true, source: string, flags?: string, patternTransformers?: string[], exactMarkers?: boolean };
type RGXJSONClassToken = { $rgx: true, class: string, args?: RGXJSONValue[] };
type RGXJSONInterpolationToken = { $rgx: true, interpolation: string };
type RGXJSONObjectToken = RGXJSONLiteralToken | RGXJSONClassToken | RGXJSONInterpolationToken;
type RGXJSONToken = RGXJSONNativeToken | RGXJSONObjectToken | RGXJSONToken[];
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXInterpolationToken | RGXJSONObjectToken | RGXToken[];
```

# RGXAtomicToken
A class representing an atomic group: its tokens are matched, in order, the first way they can match, and once they have matched, the pattern never backtracks into them to try another way. This is how each step of a walker behaves, and it is the standard defense against catastrophic backtracking. For example, `/a+/` followed by `"a"` matches `"aaa"`, since `a+` gives back its last `a`, but an atomic `/a+/` followed by `"a"` never matches. An atomic union commits to the first alternative that matches, the same way a walker picks a branch.

```typescript
rgxa([rgxInterpolation("^"), /a+/, "a", rgxInterpolation("$")]).test("aaa");            // true
rgxa([rgxInterpolation("^"), rgxAtomic(/a+/), "a", rgxInterpolation("$")]).test("aaa"); // false
```

A function `rgxAtomic` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword. Any class token can also be made atomic with its `atomic()` method (see [base.md](./base.md)), and a repeat can be made possessive with the `possessive` option of `RGXRepeatToken` (see [repeat.md](./repeat.md)).

JavaScript has no atomic groups, so they are emulated with a lookahead that captures the match, followed by a backreference to the capture: `(?=(?<rgx_atomic_000000>a+))\k<rgx_atomic_000000>`. Each atomic group adds a capture group to the compiled pattern, and the library gives each one a unique name when the pattern is compiled. See [Atomic groups](../../general.md#atomic-groups) for how these groups are named, how they affect numeric backreferences and `match.groups`, and which names are reserved.

## Static Properties
- `check(value: unknown): value is RGXAtomicToken`: A type guard that checks if the given value is an instance of `RGXAtomicToken`.
- `assert(value: unknown): asserts value is RGXAtomicToken`: An assertion that checks if the given value is an instance of `RGXAtomicToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.
- `fromJSON(json: RGXJSONClassToken): RGXAtomicToken`: Constructs an `RGXAtomicToken` from a JSON class token, passing `rgxTokenFromJSON(tokens)` to the constructor (or no tokens, if `tokens` is missing). Throws `RGXInvalidJSONTokenError` if `json` is not a JSON class token for `"RGXAtomicToken"`, and `RGXJSONClassArgsValidationFailedError` if the arguments are invalid. The JSON arguments are `[tokens?]`, where `tokens` must be a JSON token. Nested JSON tokens only have their shape checked here, since converting them validates their contents.

## Constructor
```typescript
constructor(tokens?: RGXToken)
```
- `tokens` (`RGXToken`, optional): The tokens to match atomically. An array lists tokens to concatenate, and anything else, including a union token, is a single token. To make a union atomic, pass it inside an array (`[[a, b]]`) or as an `RGXClassUnionToken`. Defaults to no tokens.

## Properties
- `tokens` (`RGXToken[]`): The tokens to match atomically, concatenated in order.
- `rgxIsRepeatable` (`boolean`): Whether the tokens consume characters, since the backreference consumes exactly what they matched. So an atomic lookahead can't be repeated. Tokens that can't be resolved on their own are assumed to consume characters. This property only has a getter.

## Methods
- `toRgx(currentFlags?: string) => RGXToken`: Concatenates the tokens and wraps the result in an atomic group, returning a `RegExp`. Returns `null` (a no-op) when the tokens resolve to nothing. `currentFlags` (`string`, optional, defaults to `''`) is the flags in effect where the token is placed; the tokens are resolved with it, and the returned `RegExp` carries its localizable and unicode flags, so resolving the result in that context leaves those flags alone. The result is the same every time, with the placeholder name `rgx_atomic_000000`, which is renamed when the pattern is compiled.
- `rgxAcceptInsertion(context: RGXInsertionContext) => string | boolean`: Rejects being placed inside a lookbehind (an `RGXLookbehindToken`, or a JSON class token for one, at any level above it), since a lookbehind is matched from right to left, so the backreference would be matched before its group. Accepts any other place.
- `atomic() => RGXAtomicToken`: Returns the token itself, since it is already atomic.
- `clone(depth: CloneDepth = "max") => RGXAtomicToken`: Creates a clone of this token. When `depth` is `0`, returns `this`; otherwise, returns a new `RGXAtomicToken` with its tokens cloned to one level less.
- `toJSON() => RGXJSONClassToken`: Returns a JSON class token with `class` set to `"RGXAtomicToken"` and `args` set to `[rgxTokenToJSON(tokens)]`. The result is accepted by `fromJSON` and by `rgxTokenFromJSON` (see [../../json.md](../../json.md)). Nested tokens are converted with `rgxTokenToJSON`, so plain convertible tokens inside this token are resolved into JSON literal tokens.
