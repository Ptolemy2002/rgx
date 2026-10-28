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

// See src/constants.ts for the actual mapping of predefined constant names to their token values
type RGXPredefinedConstant = keyof typeof RGX_PREDEFINED_CONSTANTS;
type RGXConstantName = RGXPredefinedConstant | (string & {});
```

# RGXConstantToken
A class representing a reference to a constant (see [constants.md](../../constants.md)) by name. It resolves like the constant it refers to, and takes on the constant's `rgxIsRepeatable` and `rgxAcceptInsertion` behavior, so it can be used anywhere the constant could. Since it stores only the name, its JSON form keeps the link to the constant, and changes made to it never affect the constant.

`rgxConstant(name, cache)` creates an `RGXConstantToken` after checking that the constant exists. The constructor doesn't check, so a reference (for example, one converted from JSON) can be created before its constant is defined, as long as the constant is defined by the time the reference is used.

## Static Properties
- `check(value: unknown): value is RGXConstantToken`: A type guard that checks if the given value is an instance of `RGXConstantToken`.
- `assert(value: unknown): asserts value is RGXConstantToken`: An assertion that checks if the given value is an instance of `RGXConstantToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.
- `fromJSON(json: RGXJSONClassToken): RGXConstantToken`: Constructs an `RGXConstantToken` from a JSON class token, passing `name` and `cache` to the constructor. Throws `RGXInvalidJSONTokenError` if `json` is not a JSON class token for `"RGXConstantToken"`, and `RGXJSONClassArgsValidationFailedError` if the arguments are invalid. The JSON arguments are `[name, cache?]`, where `name` must be a string and `cache`, if present, a boolean. The constant doesn't need to exist yet.

## Constructor
```typescript
constructor(name: RGXConstantName, cache: boolean = false)
```
- `name` (`RGXConstantName`): The name of the constant to refer to.
- `cache` (`boolean`, optional): Whether to keep the constant's token after looking it up the first time. Defaults to `false`, which looks the constant up every time the token is used, so the reference follows the constant if it is deleted and defined again.

## Properties
- `name` (`RGXConstantName`): The name of the constant. Setting this clears the cached token.
- `cache` (`boolean`): Whether the token found by the first lookup is kept. Setting this to `false` clears the cached token.

## Methods
- `getConstant() => RGXClassToken`: Returns the token the constant is defined as (the same object `rgxConstantValue(name)` returns). With `cache` on, the first lookup is kept and returned from then on, even if the constant is deleted or defined again. Throws `RGXInvalidConstantKeyError` if the constant has to be looked up and doesn't exist.
- `clearCache() => void`: Forgets the cached token, so the next use looks the constant up again.
- `toRgx() => RGXClassToken`: Returns `getConstant()`, which the resolver then resolves in place of this token.
- `rgxIsRepeatable` (`boolean | undefined`): The `rgxIsRepeatable` of `getConstant()`. This property only has a getter.
- `rgxAcceptInsertion(context: RGXInsertionContext) => string | boolean`: Returns the result of `getConstant().rgxAcceptInsertion(context)`. When the pattern is built, the constant's token is only checked through this method, at the reference's placement, and not again inside the reference.
- `clone(depth: CloneDepth = "max") => RGXConstantToken`: Creates a clone of this token. When `depth` is `0`, returns `this`; otherwise, returns a new `RGXConstantToken` with the same `name` and `cache`. The cached token isn't copied, since it belongs to the constant, so the clone looks the constant up again.
- `toJSON() => RGXJSONClassToken`: Returns a JSON class token with `class` set to `"RGXConstantToken"` and `args` set to `[name, cache]`. The cached token isn't stored, so a cached reference converted back from JSON caches whatever the constant is defined as when it is first used. The result is accepted by `fromJSON` and by `rgxTokenFromJSON` (see [../../json.md](../../json.md)).

```typescript
const token = rgxConstant("digit").repeat(1, 3);
const json = rgxTokenToJSONString(token);
// {"$rgx":true,"class":"RGXRepeatToken","args":[{"$rgx":true,"class":"RGXConstantToken","args":["digit",false]},1,3,false]}
const restored = rgxTokenFromJSONString(json) as RGXRepeatToken;
(restored.token as RGXConstantToken).name; // "digit"
```
