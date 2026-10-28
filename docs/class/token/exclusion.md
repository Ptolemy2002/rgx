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
```

# RGXExclusionToken
A token that matches an instance of a pattern while excluding specific alternatives. It works by combining a named lookahead group, a negative lookahead for the exclusions, and a backreference to consume the matched text. The result is a pattern that matches the main token only when it does not begin with any of the exclusion patterns.

A function `rgxExclusion` is provided with the same parameters as this class' constructor, for easier instantiation without needing to use the `new` keyword.

**Important**: The `exclusionId` must be a valid JavaScript identifier (letters, digits, `_`, or `$`; cannot start with a digit) and must be unique as a named capture group across this branch of the entire pattern. This uniqueness cannot be verified automatically and is the caller's responsibility.

**Note on partial exclusions**: The exclusions prevent a match only when the matched text *begins with* an exclusion pattern, not only when it equals one entirely. To restrict exclusions to whole-token matches, supply a zero-width boundary token (such as `/\b/` or a lookahead anchor) as the `terminal` parameter.

## Static Properties
- `check(value: unknown): value is RGXExclusionToken`: A type guard that checks if the given value is an instance of `RGXExclusionToken`.
- `assert(value: unknown): asserts value is RGXExclusionToken`: An assertion that checks if the given value is an instance of `RGXExclusionToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.
- `fromJSON(json: RGXJSONClassToken): RGXExclusionToken`: Constructs an `RGXExclusionToken` from a JSON class token, converting `token`, `exclusions` (or `[]` when omitted), and `terminal` (or `null` when omitted) with `rgxTokenFromJSON`. Throws `RGXInvalidJSONTokenError` if `json` is not a JSON class token for `"RGXExclusionToken"`, and `RGXJSONClassArgsValidationFailedError` if the arguments are invalid. The JSON arguments are `[exclusionId, token, exclusions?, terminal?]`, where `exclusionId` must be a string and `token`, `exclusions`, and `terminal` must be JSON tokens (the latter two optional). Nested JSON tokens only have their shape checked here, since converting them validates their contents (throwing the corresponding error).

## Constructor
```typescript
constructor(exclusionId: string, token: RGXToken, exclusions: RGXToken = [], terminal: RGXToken = null)
```
- `exclusionId` (`string`): A valid JavaScript identifier used as the named capture group for the lookahead. Must be unique across the branch. Throws `RGXInvalidIdentifierError` if the value is not a valid identifier.
- `token` (`RGXToken`): The main token to match.
- `exclusions` (`RGXToken`, optional): The patterns to exclude: an array or `RGXClassUnionToken` of alternatives, or a single token. These are combined into an `RGXClassUnionToken` internally. Defaults to `[]`.
- `terminal` (`RGXToken`, optional): A zero-width anchor appended to both the lookahead and the negative lookahead, used to ensure exclusions are evaluated at a word or token boundary. Should not consume characters. Defaults to `null`.

## Properties
- `exclusionId` (`string`): The named capture group identifier. The setter validates that the new value is a valid identifier and throws `RGXInvalidIdentifierError` if it is not.
- `token` (`RGXToken`): The main token whose match is being filtered.
- `exclusions` (`RGXClassUnionToken`): The union of exclusion patterns, built from the `exclusions` token passed to the constructor.
- `terminal` (`RGXToken`): The zero-width terminal anchor, or `null` if none was provided.

## Methods
- `toRgx(currentFlags?: string) => RegExp`: Builds the exclusion pattern as a `RegExp`. The resulting source has the form `(?=(?<exclusionId>token terminal))(?!exclusions terminal)\k<exclusionId>`, where `terminal` resolves to an empty string when `null`. `currentFlags` (`string`, optional, defaults to `''`) is the flags in effect where the token is placed, including those set by enclosing flag-modifier groups; `token`, `exclusions` and `terminal` are resolved with it, and the returned `RegExp` carries its localizable and unicode flags, so resolving the result in that context leaves those flags alone.
- `clone(depth: CloneDepth = "max") => ThisType<this>`: Creates a clone of this instance to a specified depth: `0` for no clone (returns `this`), `1` for a shallow clone of the top-level token, any other number for that many levels down, and `"max"` (the default) for a full deep clone.
- `toJSON() => RGXJSONClassToken`: Returns a JSON class token with `class` set to `"RGXExclusionToken"` and `args` set to `[exclusionId, rgxTokenToJSON(token), exclusions, rgxTokenToJSON(terminal)]`, where `exclusions` is the array of the exclusion union's tokens converted with `rgxTokenToJSON`. The result is accepted by `fromJSON` and by `rgxTokenFromJSON` (see [../../json.md](../../json.md)). Nested tokens are converted with `rgxTokenToJSON`, so plain convertible tokens inside this token are resolved into JSON literal tokens.
