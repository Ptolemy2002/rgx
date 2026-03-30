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
type RGXConvertibleToken = {
    toRgx: () => RGXToken,
    rgxAcceptInsertion?: (tokens: RGXToken[], flags: ValidRegexFlags) => string | boolean,
    readonly rgxGroupWrap?: boolean,
    readonly rgxIsGroup?: boolean,
    readonly rgxIsRepeatable?: boolean,
    readonly rgxInterpolate?: boolean
};
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXToken[];
type RGXClassTokenConstructor = new (...args: unknown[]) => RGXClassToken;
type RGXTokenCollectionInput = RGXToken | RGXTokenCollection;
```

# RGXClassToken (abstract)
An abstract base class for creating custom RGX token classes. Subclasses must implement the `toRgx()` method, which returns any valid `RGXToken` (including other convertible tokens, allowing for recursive structures). Subclasses must also implement the `clone(depth?: CloneDepth)` method, which creates a copy of the token instance.

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

## Abstract Methods
- `toRgx() => RGXToken`: Must be implemented by subclasses to return the token's regex representation as any valid RGX token (native, literal, convertible, or array of tokens).
- `clone(depth: CloneDepth = "max") => ThisType<this>`: Must be implemented by subclasses to return a deep clone of the token instance. The `depth` parameter controls how deeply nested tokens are cloned: `0` for no clone, `1` for a shallow clone of the top-level token, any other number for that many levels down, and `"max"` (the default) for a full deep clone.

## Properties
These properties only have getters.
- `rgxInterpolate` (`boolean`): Returns `false` by default. When `true`, the resolver uses the token's `toRgx()` result as-is without further resolution or escaping. Subclasses can override this to inject pre-built regex strings directly.
- `rgxIsGroup` (`boolean`): Returns `false` by default. Subclasses can override this to indicate whether the token represents a group.
- `rgxIsRepeatable` (`boolean`): Returns `true` by default. Subclasses can override this to indicate that the token cannot be wrapped in an `RGXRepeatToken`. When `false`, attempting to set this token as the `token` property of an `RGXRepeatToken` (including via `repeat()` or `optional()`) will throw an `RGXNotSupportedError`.
- `rgxGroupWrap` (`boolean`): Returns `true` by default. Controls whether the resolver wraps this token's resolved output in a non-capturing group. Subclasses can override this to prevent double-wrapping (e.g., when the token already wraps itself in a group).

## Methods
- `rgxAcceptInsertion(tokens: RGXToken[], flags: ValidRegexFlags) => string | boolean`: Called during pattern construction (via `rgx`, `rgxa`, or `rgxConcat`) to allow the token to reject its own insertion based on the surrounding tokens and the pattern's flags. Returns `true` to accept insertion (the default), `false` to reject with no reason, or a string to reject with a reason message. When a token rejects insertion, an `RGXInsertionRejectedError` is thrown. Subclasses can override this to enforce constraints such as requiring certain flags to be present.
- `or(...others: RGXTokenCollectionInput[]) => RGXClassUnionToken`: Creates an `RGXClassUnionToken` that represents a union (alternation) of this token with the provided others. If any of the `others` are `RGXClassUnionToken` instances, their tokens are flattened into the union rather than nested. If `this` is already an `RGXClassUnionToken`, its existing tokens are preserved and the others are appended.
- `group(args?: RGXGroupTokenArgs, ...others: RGXTokenCollectionInput[]) => RGXGroupToken`: Wraps this token in an `RGXGroupToken` with the provided arguments. The `args` parameter defaults to `{}`, which creates a capturing group with no name. Any additional `others` are included in the group alongside `this`. This is a convenience method that creates a new `RGXGroupToken` with `this` and the `others` as the tokens.
- `repeat(min?: number, max?: number | null, lazy?: boolean) => RGXRepeatToken`: Wraps this token in an `RGXRepeatToken` with the given repetition bounds. `min` defaults to `1`, `max` defaults to `min`, `lazy` defaults to `false`. Pass `null` for `max` to allow unlimited repetitions. When `lazy` is `true`, the resulting quantifier will be non-greedy. This is a convenience method that creates a new `RGXRepeatToken` with `this` as the token. Throws `RGXNotSupportedError` if called on a token with `rgxIsRepeatable` set to `false` (e.g., `RGXLookaroundToken`).
- `optional(lazy?: boolean) => RGXRepeatToken`: Makes this token optional (matched zero or one times). `lazy` defaults to `false`. Throws `RGXNotSupportedError` if called on a token with `rgxIsRepeatable` set to `false` (e.g., `RGXLookaroundToken`). When called on an `RGXRepeatToken`, the behavior is smart: if `min` is already `0`, the token is returned as-is; if `min` is `1`, a new `RGXRepeatToken` is returned with `min` set to `0` and the same `max`, wrapping the existing inner token; otherwise (i.e., `min > 1`), the token is wrapped in a new `RGXRepeatToken` with `min=0` and `max=1` as usual.
- `asLookahead(positive?: boolean) => RGXLookaheadToken`: Wraps this token in an `RGXLookaheadToken`. `positive` defaults to `true`. If this token is already an `RGXLookaheadToken`, it is returned as-is without re-wrapping.
- `asLookbehind(positive?: boolean) => RGXLookbehindToken`: Wraps this token in an `RGXLookbehindToken`. `positive` defaults to `true`. If this token is already an `RGXLookbehindToken`, it is returned as-is without re-wrapping.
- `subtract(exclusionId: string, exclusions?: RGXTokenCollectionInput, terminal?: RGXToken) => RGXExclusionToken`: Wraps this token in an `RGXExclusionToken` that matches this token while excluding the given patterns. `exclusions` defaults to `[]` and `terminal` defaults to `null`. See [exclusion](./exclusion.md) for details on how exclusion tokens work.
- `resolve(options?: ResolveRGXTokenOptions) => ValidRegexString`: A convenience method that resolves this token by calling `resolveRGXToken(this, options)`, returning the resolved regex string representation. `options` defaults to `{}`. Since this method is defined on `RGXClassToken`, it is available on all subclasses including `RGXClassUnionToken`, `RGXGroupToken`, `RGXRepeatToken`, and `RGXLookaroundToken`.