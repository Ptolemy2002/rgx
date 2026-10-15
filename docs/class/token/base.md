# Type Reference
The following is a reference to types relevant to the class listed in this file. The full type reference for the library can be found in [type-reference.md](../../type-reference.md).

```typescript
import { CloneDepth } from "@ptolemy2002/immutability-utils";
// type CloneDepth = number | "max";

type ResolveRGXTokenOptions = {
    groupWrap?: boolean;
    topLevel?: boolean;
    currentFlags?: string;
};

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
type RGXClassTokenConstructor = new (...args: unknown[]) => RGXClassToken;
type RGXTokenCollectionInput = RGXToken | RGXTokenCollection;
```

# RGXClassToken (abstract)
An abstract base class for creating custom RGX token classes. Subclasses must implement the `toRgx()` method, which returns any valid `RGXToken` (including other convertible tokens, allowing for recursive structures). Subclasses must also implement the `clone(depth?: CloneDepth)` method, which creates a copy of the token instance. Every subclass can be converted to a JSON token (see [json.md](../../json.md)) without any extra work, since the base `toJSON()` falls back to resolving the token into a JSON literal token. This is lossy, though: the token comes back as an `ExtRegExp` rather than an instance of the subclass. Subclasses that want lossless serialization should override the `toJSON()` method, which returns the token's JSON class token form, and the static `fromJSON` method, so that the class can be registered in the JSON class registry with `registerRGXJSONClassToken`. These two are not abstract because they are only needed for registration; the base static `fromJSON` throws `RGXNotImplementedError`.

Notably, certain methods will throw `RGXNotImplementedError` if `rgxClassInit` hasn't been called before. This was done to avoid circular dependency issues. `rgxClassInit` is called on the import of the main entry point, so it shouldn't be an issue most of the time. For documentation sake, the methods that `rgxClassInit` registers are as follows:-
- `or`
- `group`
- `repeat`
- `optional`
- `asLookahead`
- `asLookbehind`
- `subtract`

## Static Properties
- `check(value: unknown): value is RGXClassToken`: A type guard that checks if the given value is an instance of `RGXClassToken`.
- `assert(value: unknown): asserts value is RGXClassToken`: An assertion that checks if the given value is an instance of `RGXClassToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.
- `fromJSON(json: RGXJSONClassToken): RGXClassToken`: Intended to be overridden by subclasses that will be registered in the JSON class registry, to construct an instance from a JSON class token. Implementations should use `rgxJSONClassArgs` (see [json.md](../../json.md)) to check the class name and parse the arguments. `fromJSON` is the only place the arguments are validated, both when it is called directly and when the registry calls it. The base implementation throws `RGXNotImplementedError`.

## Abstract Methods
- `toRgx(currentFlags?: string) => RGXToken`: Must be implemented by subclasses to return the token's regex representation as any valid RGX token (native, literal, convertible, or array of tokens). `currentFlags` is the flags in effect where the token is placed, including those set by enclosing flag-modifier groups (`resolveRGXToken` passes its `currentFlags` option). Implementations may ignore it. Ones that resolve other tokens should pass it on as the `currentFlags` option of `resolveRGXToken`, and ones that return a `RegExp` meant to inherit the surrounding flags should give it the localizable flags in `currentFlags`, since a literal token's flags are otherwise treated as the flags it asks for (see `resolveRGXToken` in [general.md](../../general.md)).
- `clone(depth: CloneDepth = "max") => ThisType<this>`: Must be implemented by subclasses to return a deep clone of the token instance. The `depth` parameter controls how deeply nested tokens are cloned: `0` for no clone, `1` for a shallow clone of the top-level token, any other number for that many levels down, and `"max"` (the default) for a full deep clone.

## Properties
These properties only have getters.
- `rgxIsRepeatable` (`boolean | undefined`): Returns `undefined` by default, meaning the token has no explicit preference: it is repeatable unless its resolved source is detected as consuming no characters (see `isRGXToken` in [type-guards.md](../../type-guards.md)), so a subclass whose output is made entirely of assertions doesn't need to override this. Subclasses can override this to set an explicit preference, which is always trusted. When the token is not repeatable, attempting to set it as the `token` property of an `RGXRepeatToken` (including via `repeat()` or `optional()`) will throw an `RGXNotSupportedError`. When it is explicitly `true` but the token consumes no characters, repeating it is allowed, but a warning is printed with `console.warn` (at most once per token).

## Methods
- `rgxAcceptInsertion(context: RGXInsertionContext) => string | boolean`: Called while a pattern is being built (via `rgx`, `rgxa`, `rgxw`, or `rgxwa`) to allow the token to reject its own insertion based on where it is placed. Returns `true` to accept insertion (the default), `false` to reject with no reason, or a string to reject with a reason message. When a token rejects insertion, an `RGXInsertionRejectedError` is thrown. Subclasses can override this to enforce constraints such as requiring certain flags to be present. The same applies to the optional `rgxAcceptInsertion` property of any convertible token.

  The hook is called once for each place the token is inserted, at any depth: tokens nested in groups, lookarounds, repeats, unions, collections, exclusions, wrappers, arrays, and the results of `toRgx()` are all checked. The read-only `context` describes the place:
  - `flags`: The flags effective at this position. This is the pattern's flags (`''` for walkers, which match each token without flags), with the localizable flags (`i`, `m`, `s`) replaced by those of the innermost enclosing `RGXGroupToken` that sets `flags`.
  - `siblings` and `index`: The tokens at the same level and this token's position among them. At the top level, `siblings` is the array given to `rgxa` (or the template's parts and tokens). Inside a container, it is the container's own tokens (for example, a group's tokens or a union's alternatives), or just this token for containers with a single token (such as a repeat's token, or the token an `RGXClassWrapperToken` wraps).
  - `parent` and `container`: The context of the enclosing level and the token whose contents this level is, or `null` at the top level. Following `parent` up gives the path to the token from the top level.

  The hook is only called while a pattern is being built. A standalone `resolveRGXToken` or `rgxConcat`, `toJSON()`, type guards, and checks the library makes while building (such as whether a token is a singleton or repeatable) never call it, and anything the hook itself resolves is not checked either. Since the type guards don't call it, its return value is checked when it is called: anything other than a string or boolean throws an `RGXInvalidTokenError`. Checking the whole pattern (for example, that a named group exists anywhere in it) is out of scope, since opaque convertible tokens can't be inspected structurally.
- `or(...others: RGXTokenCollectionInput[]) => RGXClassUnionToken`: Creates an `RGXClassUnionToken` that represents a union (alternation) of this token with the provided others. If any of the `others` are `RGXClassUnionToken` instances, their tokens are flattened into the union rather than nested. If `this` is already an `RGXClassUnionToken`, its existing tokens are preserved and the others are appended.
- `group(args?: RGXGroupTokenArgs, ...others: RGXTokenCollectionInput[]) => RGXGroupToken`: Wraps this token in an `RGXGroupToken` with the provided arguments. The `args` parameter defaults to `{}`, which creates a capturing group with no name. Any additional `others` are included in the group alongside `this`. This is a convenience method that creates a new `RGXGroupToken` with `this` and the `others` as the tokens.
- `repeat(min?: number, max?: number | null, lazy?: boolean) => RGXRepeatToken`: Wraps this token in an `RGXRepeatToken` with the given repetition bounds. `min` defaults to `1`, `max` defaults to `min`, `lazy` defaults to `false`. Pass `null` for `max` to allow unlimited repetitions. When `lazy` is `true`, the resulting quantifier will be non-greedy. This is a convenience method that creates a new `RGXRepeatToken` with `this` as the token. Throws `RGXNotSupportedError` if called on a token that is not repeatable, i.e. one with `rgxIsRepeatable` set to `false`, or one without a preference that is detected as consuming no characters (e.g., `RGXLookaroundToken`).
- `optional(lazy?: boolean) => RGXRepeatToken`: Makes this token optional (matched zero or one times). `lazy` defaults to `false`. Throws `RGXNotSupportedError` if called on a token that is not repeatable (see `repeat()`). When called on an `RGXRepeatToken`, the behavior is smart: if `min` is already `0`, the token is returned as-is; if `min` is `1`, a new `RGXRepeatToken` is returned with `min` set to `0` and the same `max`, wrapping the existing inner token; otherwise (i.e., `min > 1`), the token is wrapped in a new `RGXRepeatToken` with `min=0` and `max=1` as usual.
- `asLookahead(positive?: boolean) => RGXLookaheadToken`: Wraps this token in an `RGXLookaheadToken`. `positive` defaults to `true`. If this token is already an `RGXLookaheadToken`, it is returned as-is without re-wrapping. If it is an `RGXLookbehindToken`, it is converted with `reverse()` instead, which keeps its own positivity and ignores `positive`.
- `asLookbehind(positive?: boolean) => RGXLookbehindToken`: Wraps this token in an `RGXLookbehindToken`. `positive` defaults to `true`. If this token is already an `RGXLookbehindToken`, it is returned as-is without re-wrapping. If it is an `RGXLookaheadToken`, it is converted with `reverse()` instead, which keeps its own positivity and ignores `positive`.
- `subtract(exclusionId: string, exclusions?: RGXTokenCollectionInput, terminal?: RGXToken) => RGXExclusionToken`: Wraps this token in an `RGXExclusionToken` that matches this token while excluding the given patterns. `exclusions` defaults to `[]` and `terminal` defaults to `null`. See [exclusion](./exclusion.md) for details on how exclusion tokens work.
- `toJSON() => RGXJSONObjectToken`: Intended to be overridden by subclasses that will be registered in the JSON class registry, to return a JSON class token (`{ $rgx: true, class, args }`) whose `args`, when given to the class registered under `class` in the JSON class registry, reconstruct an equivalent token. `createRGXJSONClassToken` and `rgxTokenToJSON` (see [json.md](../../json.md)) are the intended helpers for building it. Because the method is named `toJSON`, `JSON.stringify` on a class token produces this form automatically. The base implementation instead returns a JSON literal token made from `resolveRGXToken(this, { groupWrap: false })` (with any groups that are redundant in an isolated source removed), the same lossy fallback `rgxTokenToJSON` uses for plain convertible tokens, so subclasses that do not override it remain serializable (though they come back as `ExtRegExp` instances rather than instances of the subclass). `rgxTokenToJSON` treats such subclasses as plain convertible tokens, so it throws `RGXNotJSONSerializableError` for them when `resolveConvertible` is `false`.
- `resolve(options?: ResolveRGXTokenOptions) => ValidRegexString`: A convenience method that resolves this token by calling `resolveRGXToken(this, options)`, returning the resolved regex string representation. `options` defaults to `{}`. Since this method is defined on `RGXClassToken`, it is available on all subclasses including `RGXClassUnionToken`, `RGXGroupToken`, `RGXRepeatToken`, and `RGXLookaroundToken`.