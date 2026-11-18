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

type RGXCapture<T = unknown> = {
    raw: string;
    value: T;
    start: number;
    end: number;
    ownerId: string | null;
    branch: number;
    groups: Record<string, string> | null;
};
// RGXPart is documented in walker.md.
type RGXListItem<T = unknown> = RGXPart<any, any, T> | RGXToken;
type RGXJSONListItem = RGXJSONToken | { alias: string };

type RGXPermutationItemConfig<T = unknown> = {
    item: RGXListItem<T>;
    min?: number;
    max?: number | null;
};
type RGXPermutationItem<T = unknown> = RGXListItem<T> | RGXPermutationItemConfig<T>;
type RGXPermutationItemBounds<T = unknown> = { item: RGXListItem<T>; min: number; max: number | null };
type RGXPermutationTokenOptions = {
    min?: number | null;
    max?: number | null;
    separator?: RGXToken;
    atomic?: boolean;
};
type RGXTokenParseOptions = {
    flags?: string;
    matched?: boolean;
};
type RGXPermutationParseOptions = RGXTokenParseOptions;
type RGXJSONPermutationItem = RGXJSONListItem | { item: RGXJSONListItem; min?: number; max?: number | null };
type RGXJSONPermutationTokenOptions = Omit<RGXPermutationTokenOptions, "separator"> & { separator?: RGXJSONToken };
```

# RGXPermutationToken\<T = unknown\>
A class, implementing `RGXParsableToken` (see [parsable.md](./parsable.md)), representing a set of items that can come in any order, such as modifiers on a declaration. By default, every item appears exactly once, so `["a", "b", "c"]` matches `abc`, `cab` and every other order. Each item can have its own bounds on how many times it appears, and the token has bounds on the number of items in total, so it can also match any subset of the items, or let some of them repeat.

A pattern listing every order would grow factorially with the number of items, so the pattern only matches a run of items (with a separator between each one, if there is one) within the total bounds, such as `(?:a|b|c){3}`. It doesn't check how many times each item appears, so it also matches `aab`. The counts are checked by `parse()`, which walks the text the permutation matched with the same items, and throws as soon as any condition isn't met. A part that matches the permutation can call it from its `validate` or `transform`:

```typescript
const modifiers = rgxPermutation(["public", "static", "final"], { separator: " ", min: 1 });
// The part's raw text is a match of the permutation, so the pattern check can be skipped.
const part = rgxPart(modifiers, { id: "modifiers", transform: raw => modifiers.parse(raw, { matched: true }).map(item => item.raw) });

const walker = rgxwa("static final", [part]);
walker.walk();
walker.lastCapture("modifiers").value; // ["static", "final"]

rgxwa("static static", [part]).walk(); // throws RGXPermutationParseFailedError: item 1 appears more than once
```

`parse()` can be given any text, so it first checks that the permutation's pattern matches all of it (see `matchesWhole()`), and throws one `RGXPermutationParseFailedError` if it doesn't, rather than an error from partway through the walk. When the text is already known to be a match, such as the raw text of a part whose token is the permutation, `matched: true` skips that check.

Since the count check runs after the match, it doesn't make the pattern backtrack: when the pattern matched more items than the counts allow, the match fails as a whole rather than falling back to fewer items.

A function `rgxPermutation` is provided with the same parameters as this class' constructor (and the same type parameter), for easier instantiation without needing to use the `new` keyword.

Items are the same as the item alternatives of `RGXListToken` (see [list.md](./list.md)): parts, whose `rawTransform`, `transform`, `validate` and hooks apply when the permutation is parsed, or plain tokens. Only alias parts can be serialized to JSON. To give an item its own bounds, pass an `RGXPermutationItemConfig` object in its place (an object with an `item` property that isn't a token itself).

By default, the items and separators are matched atomically (see the `atomic` option in [group.md](./group.md)), the way a walker matches each step, so `parse()` always splits the text the same way the pattern did. Each item is tried in order, and the first one that matches is taken, so when one item is a prefix of another (`"a"` and `"ab"`), list the longer one first. Turning this off with the `atomic` option lets the pattern backtrack, so it may match text that `parse()` can't split.

Without a separator, each item token appears once in the pattern, so items can contain named groups. With a separator, the item tokens appear twice (once for the first item, and once in the repeated part), so they can't.

## Static Properties
- `check(value: unknown): value is RGXPermutationToken`: A type guard that checks if the given value is an instance of `RGXPermutationToken`.
- `assert(value: unknown): asserts value is RGXPermutationToken`: An assertion that checks if the given value is an instance of `RGXPermutationToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.
- `fromJSON(json: RGXJSONClassToken): RGXPermutationToken`: Constructs an `RGXPermutationToken` from a JSON class token. Throws `RGXInvalidJSONTokenError` if `json` is not a JSON class token for `"RGXPermutationToken"`, and `RGXJSONClassArgsValidationFailedError` if the arguments are invalid. The JSON arguments are `[items, options?]`, where `items` is an array of items (each an `RGXJSONPermutationItem`: a JSON token, `{ alias: string }` for an alias part, or `{ item, min?, max? }` with one of those as `item`), and `options` an object with the same fields as `RGXPermutationTokenOptions`, with `separator` as a JSON token (an `RGXJSONPermutationTokenOptions`). Aliases don't have to be registered until the permutation is used.

## Constructor
```typescript
constructor(items: RGXPermutationItem<T>[], options?: RGXPermutationTokenOptions)
```
- `items` (`RGXPermutationItem<T>[]`): The items. Each is an item, which can appear at most once, or an `RGXPermutationItemConfig` with its own bounds:
  - `item` (`RGXListItem<T>`): The item.
  - `min` (`number`, optional): The fewest times the item must appear. Must be >= 0. Non-integer values are floored. Defaults to `0`, so the total bounds decide which items appear.
  - `max` (`number | null`, optional): The most times the item can appear, or `null` for no limit. Must be >= `min`. Non-integer values are floored. Defaults to `1`.
  Invalid bounds throw `RGXOutOfBoundsError`.
- `options` (`RGXPermutationTokenOptions`, optional):
  - `min` (`number | null`, optional): The fewest items in total. Must be >= 0 and <= `maxLength()`. Non-integer values are floored. Defaults to `null`, which means the number of items, or `maxLength()` when it is lower (see `minLength()`).
  - `max` (`number | null`, optional): The most items in total. Must be >= `min`. Non-integer values are floored. Defaults to `null`, which means the sum of the items' maximums, or no limit when an item has none (see `maxLength()`).
  - `separator` (`RGXToken`, optional): A token matched between items. Defaults to no separator (`undefined`, since `null` is a token that matches nothing).
  - `atomic` (`boolean`, optional): Whether items and separators are matched atomically. Defaults to `true`.

## Properties
- `items` (`RGXPermutationItemBounds<T>[]`): The items, each with its `min` and `max` filled in.
- `min` (`number | null`) and `max` (`number | null`): The bounds on the number of items in total, as given (`null` for the defaults), validated and floored the same way as the constructor's options. Invalid values throw `RGXOutOfBoundsError`.
- `separator` (`RGXToken | undefined`): The separator, or `undefined` for none.
- `atomicItems` (`boolean`): The `atomic` option, named differently from the `atomic()` method every class token has.

## Methods
- `hasSeparator() => this is RGXPermutationToken<T> & { separator: RGXToken }`: Whether the permutation has a separator.
- `minLength() => number`: The fewest items in total: `min`, or when it is `null`, the number of items, or `maxLength()` when that is lower.
- `maxLength() => number | null`: The most items in total: `max`, or when it is `null`, the sum of the items' maximums, or `null` (no limit) when an item has no maximum.
- `itemTokens() => RGXToken[]`: The token each item is matched with: the token of a part (the registered part's, for an alias part), or the plain token itself. Throws `RGXNotSupportedError` for a dynamic part, whose token can only be produced by a walker, and `RGXInvalidPartAliasError` for an alias that isn't registered.
- `toRgx() => RGXToken`: Returns the tokens that match the permutation: the union of the items, repeated between `minLength()` and `maxLength()` times. With a separator, it is instead the first item, then a separator and an item repeated between `minLength() - 1` (at least `0`) and `maxLength() - 1` times, all optional when `minLength()` is `0`. Returns `null` (a no-op) when there are no items or `maxLength()` is `0`. With the `atomic` option, the union of items and the separator are each wrapped in a non-capturing atomic group, so the permutation can't be placed inside a lookbehind.
- `matchesWhole(text: string, flags?: string) => boolean`: Whether the permutation's pattern matches all of `text`, with the localizable flags (`i`, `m` and `s`) of `flags` (defaults to `""`). It doesn't check how many times each item appears. The regex is built once for each set of flags and cached on the token, and rebuilt when the bounds, separator, `atomic` option or item tokens change.
- `parse(text: string, options?: RGXPermutationParseOptions) => RGXCapture<T>[]`: Checks that the permutation's pattern matches all of `text` (`matchesWhole()`), throwing an `RGXPermutationParseFailedError` at position `0` if it doesn't, then walks `text` and returns a capture for each item, the same way as `RGXListToken.parse()`: its `raw` text and `value` (from its part, if it is one), its `start` and `end` in `text`, its part's `ownerId`, the index of the item in `items` as its `branch` (when there is more than one item), and its `groups`. Separators aren't returned. It throws an `RGXPermutationParseFailedError` as soon as an item appears more times than its `max` (before the item's later neighbors are matched or validated) or there would be more than `maxLength()` items, and after the walk if the items don't cover all of `text`, there are fewer than `minLength()`, or an item appears fewer times than its `min`. The walker's errors are thrown when an item or separator doesn't match where one is expected, or an item fails validation. An item that a hook keeps from being recorded isn't counted. `options.flags` (`string`, optional) is the flags the permutation is matched with, both by the check and by the walker, since a walker matches without flags; pass the flags in effect where the permutation is placed (the pattern's own and those of enclosing groups). Only its localizable flags (`i`, `m` and `s`) are used. With flags, each item part is matched through a copy with the same options, so hooks receive the copy as their `part`. `options.matched` (`boolean`, optional) skips the pattern check, for text already known to be a match. Defaults to `false`.
- `clone(depth: CloneDepth = "max") => RGXPermutationToken<T>`: Creates a clone of this token. When `depth` is `0`, returns `this`; otherwise, returns a new `RGXPermutationToken` with its items (parts with `clone()`) and separator cloned to one level less, and the same bounds and options.
- `toJSON() => RGXJSONClassToken`: Returns a JSON class token with `class` set to `"RGXPermutationToken"` and `args` set to `[items, { min, max, atomic, separator }]` (with `separator` converted with `rgxTokenToJSON`, and left out when there is none). Each item is converted with `rgxTokenToJSON`, or stored as `{ alias }` for an alias part, and items whose bounds aren't the defaults (`min` of `0` and `max` of `1`) are stored as `{ item, min, max }`. Throws `RGXNotJSONSerializableError` for a part that isn't an alias part. The result is accepted by `fromJSON` and by `rgxTokenFromJSON` (see [../../json.md](../../json.md)).

# isRGXPermutationItemConfig
```typescript
function isRGXPermutationItemConfig<T>(value: RGXPermutationItem<T>): value is RGXPermutationItemConfig<T>
```
Checks whether an item given to `RGXPermutationToken` is an `RGXPermutationItemConfig` rather than an item itself: a plain object with an `item` property that isn't a token (it has no `toRgx`, `$rgx` or `rgxInterpolation` property, and isn't an array, a regex or a part).

## Parameters
  - `value` (`RGXPermutationItem<T>`): The item to check.

## Returns
- `boolean`: Whether `value` is an `RGXPermutationItemConfig`.
