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
type RGXJSONLiteralToken = { $rgx: true, source: string, flags?: string };
type RGXJSONClassToken = { $rgx: true, class: string, args?: RGXJSONValue[] };
type RGXJSONInterpolationToken = { $rgx: true, interpolation: string };
type RGXJSONObjectToken = RGXJSONLiteralToken | RGXJSONClassToken | RGXJSONInterpolationToken;
type RGXJSONToken = RGXJSONNativeToken | RGXJSONObjectToken | RGXJSONToken[];
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXInterpolationToken | RGXJSONObjectToken | RGXToken[];

const validIdentifierSymbol = Symbol('rgx.ValidIdentifier');
type ValidIdentifierBrandSymbol = typeof validIdentifierSymbol;
type ValidIdentifier = Branded<string, [ValidIdentifierBrandSymbol]>;
```

# RGXSubpatternToken
A class representing a backreference to a previously captured group, either by name or by group number. Named backreferences produce `\k<name>` and numbered backreferences produce `\N` (where N is the group number). This is useful for matching the same text that was captured by a previous group.

A function `rgxSubpattern` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

## Static Properties
- `check(value: unknown): value is RGXSubpatternToken`: A type guard that checks if the given value is an instance of `RGXSubpatternToken`.
- `assert(value: unknown): asserts value is RGXSubpatternToken`: An assertion that checks if the given value is an instance of `RGXSubpatternToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.
- `fromJSON(json: RGXJSONClassToken): RGXSubpatternToken`: Constructs an `RGXSubpatternToken` from a JSON class token, passing `pattern` to the constructor. Throws `RGXInvalidJSONTokenError` if `json` is not a JSON class token for `"RGXSubpatternToken"`, and `RGXJSONClassArgsValidationFailedError` if the arguments are invalid. The JSON arguments are `[pattern]`, where `pattern` must be a string or number. Nested JSON tokens only have their shape checked here, since converting them validates their contents (throwing the corresponding error).

## Constructor
```typescript
constructor(pattern: string | number)
```
- `pattern` (`string | number`): The backreference pattern. If a string, it must be a valid identifier (validated via `assertValidIdentifier`) and produces a named backreference (`\k<name>`). If a number, it must be a positive integer (>= 1, as groups are 1-indexed) and produces a numbered backreference (`\N`). Non-integer numbers are floored.

## Properties
- `pattern` (`string | number`): The backreference pattern. Setting this validates the value: strings must be valid identifiers, numbers must be positive integers (>= 1). Non-integer numbers are floored.

## Methods
- `toRgx(currentFlags?: string) => RegExp`: Resolves the backreference to a `RegExp`. Named patterns produce `/\k<name>/` and numbered patterns produce `/\N/`. `currentFlags` (`string`, optional, defaults to `''`) is the flags in effect where the token is placed. The returned `RegExp` carries its localizable flags, so resolving the result in that context leaves those flags alone.
- `clone(depth: CloneDepth = "max") => RGXSubpatternToken`: Creates a clone of this token. When `depth` is `0`, returns `this`; otherwise, returns a new `RGXSubpatternToken` with the same pattern.
- `toJSON() => RGXJSONClassToken`: Returns a JSON class token with `class` set to `"RGXSubpatternToken"` and `args` set to `[pattern]`. The result is accepted by `fromJSON` and by `rgxTokenFromJSON` (see [../../json.md](../../json.md)). Nested tokens are converted with `rgxTokenToJSON`, so plain convertible tokens inside this token are resolved into JSON literal tokens.