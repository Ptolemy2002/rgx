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

# RGXExactToken
A class representing text that is matched exactly as written, whatever flags are around it. A native string token is escaped, but it still follows the flags around it: with the `i` flag it matches either case, and custom flags such as `a` (see [ExtRegExp.md](../../ExtRegExp.md)) change what it matches too. The text of an `RGXExactToken` is matched exactly: the `i` flag (of the pattern or of an enclosing modifier group) and custom flags don't change it, while the tokens around it keep following them. To make every native token in a pattern exact, use the `exact` option of `rgx`, `rgxa`, `rgxw` or `rgxwa` (see [general.md](../../general.md#exact-text) and [walker.md](../walker.md)).

```typescript
const pattern = rgxa([rgxInterpolation("^"), "id-", rgxExact("Café"), rgxInterpolation("$")], "ia");
pattern.test("ID-Café"); // true: "id-" ignores case
pattern.test("id-cafe"); // false: "Café" doesn't
```

A function `rgxExact` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

The text is resolved to a named group with the reserved prefix `rgx_exact_`, such as `(?<rgx_exact_0>Café)`, which marks it until the pattern is compiled. See [Exact text](../../general.md#exact-text) for how these groups are handled. They never reach a compiled pattern built by the library, so exact text adds no capture groups and leaves group numbers alone.

## Static Properties
- `check(value: unknown): value is RGXExactToken`: A type guard that checks if the given value is an instance of `RGXExactToken`.
- `assert(value: unknown): asserts value is RGXExactToken`: An assertion that checks if the given value is an instance of `RGXExactToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.
- `fromJSON(json: RGXJSONClassToken): RGXExactToken`: Constructs an `RGXExactToken` from a JSON class token, passing `text` to the constructor. Throws `RGXInvalidJSONTokenError` if `json` is not a JSON class token for `"RGXExactToken"`, and `RGXJSONClassArgsValidationFailedError` if the arguments are invalid. The JSON arguments are `[text]`, where `text` must be a string.

## Constructor
```typescript
constructor(text: string)
```
- `text` (`string`): The text to match exactly. Throws `RGXInvalidTokenError` if it isn't a string.

## Properties
- `text` (`string`): The text to match exactly. Setting this validates it the same way as the constructor.

## Methods
- `toRgx(currentFlags?: string) => RegExp`: Resolves the text to a `RegExp` holding the escaped text in a marker group (see `exactRegex` in [general.md](../../general.md#exactregex)). Empty text resolves to an empty pattern. `currentFlags` (`string`, optional, defaults to `''`) is the flags in effect where the token is placed. The returned `RegExp` carries its localizable flags, so resolving the result in that context leaves those flags alone.
- `clone(depth: CloneDepth = "max") => RGXExactToken`: Creates a clone of this token. When `depth` is `0`, returns `this`; otherwise, returns a new `RGXExactToken` with the same text.
- `toJSON() => RGXJSONClassToken`: Returns a JSON class token with `class` set to `"RGXExactToken"` and `args` set to `[text]`. The result is accepted by `fromJSON` and by `rgxTokenFromJSON` (see [../../json.md](../../json.md)).
