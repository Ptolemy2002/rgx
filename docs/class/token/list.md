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
type RGXListTokenOptions = {
    min?: number;
    max?: number | null;
    trailing?: boolean;
    atomic?: boolean;
};
type RGXListParseOptions = {
    flags?: string;
};
type RGXJSONListItem = RGXJSONToken | { alias: string };
```

# RGXListToken\<T = unknown\>
A class representing a list of items with a separator between each one, such as comma-separated values or path segments, with the number of items between a minimum and a maximum. The pattern only matches the items and separators, without capturing anything, so the token can be placed anywhere. To get the items themselves, call `parse()` with the text the list matched: it walks the text with the same items, so the configuration for matching and for reading the items lives in one place. A part that matches a list can call it from its `transform`:

```typescript
const numbers = rgxList<number>(rgxPart(/\d+/, { transform: Number }), ",", { min: 1, max: 5 });
rgxa([rgxInterpolation("^"), numbers, rgxInterpolation("$")]).test("1,22,333"); // true

const walker = rgxwa("[1,22,333]", ["[", rgxPart(numbers, { id: "list", transform: raw => numbers.parse(raw).map(item => item.value) }), "]"]);
walker.walk();
walker.lastCapture("list").value; // [1, 22, 333]
```

A function `rgxList` is provided with the same parameters as this class' constructor (and the same type parameter), for easier instantiation without needing to use the `new` keyword.

An item can be any of several alternatives. Each alternative is a part (see [walker.md](../walker.md)), whose `rawTransform`, `transform`, `validate` and hooks apply to the item when the list is parsed, or a plain token, whose items are the text it matched. A string is text to match, the same as everywhere else, so a registered part is referred to with an alias part (`rgxPartAlias(name)`, see [Part Aliases](../walker.md#part-aliases)). Only alias parts can be serialized to JSON.

By default, the items and separators are matched atomically (see [atomic.md](./atomic.md)), the way a walker matches each step, so `parse()` always splits the text the same way the pattern did: an item that matched is never backtracked into to make room for what follows. Turning this off with the `atomic` option lets the pattern backtrack, so it may match text that `parse()` can't split.

Each item token appears more than once in the pattern (once for the first item, and once in the repeated part), so items can't contain named groups, which would repeat.

## Static Properties
- `check(value: unknown): value is RGXListToken`: A type guard that checks if the given value is an instance of `RGXListToken`.
- `assert(value: unknown): asserts value is RGXListToken`: An assertion that checks if the given value is an instance of `RGXListToken`. If the assertion fails, an `RGXInvalidTokenError` will be thrown.
- `fromJSON(json: RGXJSONClassToken): RGXListToken`: Constructs an `RGXListToken` from a JSON class token. Throws `RGXInvalidJSONTokenError` if `json` is not a JSON class token for `"RGXListToken"`, and `RGXJSONClassArgsValidationFailedError` if the arguments are invalid. The JSON arguments are `[items, separator, options?]`, where `items` is an array of item alternatives (each an `RGXJSONListItem`: a JSON token, or `{ alias: string }` for an alias part), `separator` a JSON token, and `options` an object with the same fields as `RGXListTokenOptions`. Aliases don't have to be registered until the list is used.

## Constructor
```typescript
constructor(items: RGXListItem<T> | RGXListItem<T>[], separator: RGXToken, options?: RGXListTokenOptions)
```
- `items` (`RGXListItem<T> | RGXListItem<T>[]`): The alternatives an item can be. An array lists them, and anything else is the only alternative.
- `separator` (`RGXToken`): The token matched between items.
- `options` (`RGXListTokenOptions`, optional):
  - `min` (`number`, optional): The fewest items the list can have. Must be >= 0 and <= `max`. Non-integer values are floored. Defaults to `1`.
  - `max` (`number | null`, optional): The most items the list can have, or `null` for no limit. Must be >= `min`. Non-integer values are floored. Defaults to `null`.
  - `trailing` (`boolean`, optional): Whether a separator can follow the last item. Defaults to `false`.
  - `atomic` (`boolean`, optional): Whether items and separators are matched atomically. Defaults to `true`.

## Properties
- `items` (`RGXListItem<T>[]`): The item alternatives.
- `separator` (`RGXToken`): The separator.
- `min` (`number`) and `max` (`number | null`): The bounds on the number of items, validated and floored the same way as the constructor's options. Invalid values throw `RGXOutOfBoundsError`.
- `trailing` (`boolean`): Whether a separator can follow the last item.
- `atomicItems` (`boolean`): The `atomic` option, named differently from the `atomic()` method every class token has.

## Methods
- `itemTokens() => RGXToken[]`: The token each item alternative is matched with: the token of a part (the registered part's, for an alias part), or the plain token itself. Throws `RGXNotSupportedError` for a dynamic part, whose token can only be produced by a walker, and `RGXInvalidPartAliasError` for an alias that isn't registered.
- `toRgx() => RGXToken`: Returns the tokens that match the list: the first item, then a separator and an item repeated between `min - 1` (at least `0`) and `max - 1` times, then an optional separator if `trailing` is `true`, all optional when `min` is `0`. Returns `null` (a no-op) when `max` is `0`. With the `atomic` option, the union of item alternatives and the separator are each wrapped in an `RGXAtomicToken`, so the list can't be placed inside a lookbehind.
- `parse(text: string, options?: RGXListParseOptions) => RGXCapture<T>[]`: Walks `text`, which should be the whole text the list matched, and returns a capture for each item: its `raw` text and `value` (from its part, if it is one), its `start` and `end` in `text`, its part's `ownerId`, the index of the item alternative that matched it as its `branch`, and its `groups`. Separators aren't returned. The walker's errors are thrown when an item or separator doesn't match where one is expected (such as a trailing separator when `trailing` is `false`), or an item fails validation, and an `RGXListParseFailedError` is thrown if the list doesn't cover all of `text` (including when it has more than `max` items) or has fewer than `min` items. `options.flags` (`string`, optional) is the flags the list is matched with, since a walker matches without flags; only its localizable flags (`i`, `m` and `s`) are used. With flags, each item part is matched through a copy with the same options, so hooks receive the copy as their `part`.
- `clone(depth: CloneDepth = "max") => RGXListToken<T>`: Creates a clone of this token. When `depth` is `0`, returns `this`; otherwise, returns a new `RGXListToken` with its items (parts with `clone()`) and separator cloned to one level less, and the same options.
- `toJSON() => RGXJSONClassToken`: Returns a JSON class token with `class` set to `"RGXListToken"` and `args` set to `[items, rgxTokenToJSON(separator), { min, max, trailing, atomic }]`, where each item is converted with `rgxTokenToJSON`, or stored as `{ alias }` for an alias part. Throws `RGXNotJSONSerializableError` for a part that isn't an alias part. The result is accepted by `fromJSON` and by `rgxTokenFromJSON` (see [../../json.md](../../json.md)).
