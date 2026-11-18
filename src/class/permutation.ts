import { RGXJSONClassToken, RGXJSONObject, RGXJSONToken, RGXJSONValue, RGXToken } from "src/types";
import { createRGXJSONClassToken, rgxJSONClassArgs, rgxTokenFromJSON, rgxTokenToJSON } from "src/json";
import { RGXClassToken } from "./base";
import { rgxAtomic, RGXGroupToken } from "./group";
import { RGXRepeatToken } from "./repeat";
import { RGXListItem, RGXJSONListItem } from "./list";
import { assertInRange, RGXNotJSONSerializableError, RGXPermutationParseFailedError } from "src/errors";
import { isRGXJSONToken } from "src/typeGuards";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";
import { cloneRGXToken } from "src/clone";
import { RGXCapture, RGXPart, rgxPartAlias, RGXWalker, RGXWalkerStep } from "src/walker";
import { localizableRGXParseFlags, rgxItemParseStep, rgxItemTokens, rgxSilentParseStep } from "src/internal/listItems";

// An item of a permutation, with bounds on how many times it can appear.
export type RGXPermutationItemConfig<T = unknown> = {
    item: RGXListItem<T>;
    // The fewest times the item must appear. Defaults to 0.
    min?: number;
    // The most times the item can appear, or null for no limit. Defaults to 1.
    max?: number | null;
};

// An item as the constructor takes it: an item that can appear at most once, or one with its own bounds.
export type RGXPermutationItem<T = unknown> = RGXListItem<T> | RGXPermutationItemConfig<T>;

// An item as it is stored on the token, with its bounds filled in.
export type RGXPermutationItemBounds<T = unknown> = { item: RGXListItem<T>; min: number; max: number | null };

export type RGXPermutationTokenOptions = {
    // The fewest items in total. Defaults to the number of items (or max, when it is lower).
    min?: number | null;
    // The most items in total, or null for the sum of the items' own maximums.
    max?: number | null;
    // A token matched between items.
    separator?: RGXToken;
    // Whether the items and separators are matched atomically, the way a walker matches them.
    atomic?: boolean;
};

export type RGXPermutationParseOptions = {
    // The flags the permutation is matched with. Only the localizable flags (i, m and s) change what the walker matches.
    flags?: string;
};

// An item in JSON: an item, or an object with the item and its bounds.
export type RGXJSONPermutationItem = RGXJSONListItem | { item: RGXJSONListItem; min?: number; max?: number | null };
export type RGXJSONPermutationTokenOptions = Omit<RGXPermutationTokenOptions, "separator"> & { separator?: RGXJSONToken };

export function isRGXPermutationItemConfig<T>(value: RGXPermutationItem<T>): value is RGXPermutationItemConfig<T> {
    return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof RegExp) && !RGXPart.check(value)
        && "item" in value && !("toRgx" in value) && !("$rgx" in value) && !("rgxInterpolation" in value);
}

function isJSONAliasItem(value: unknown): value is { alias: string } {
    return typeof value === "object" && value !== null && !Array.isArray(value) && !("$rgx" in value)
        && typeof (value as { alias?: unknown }).alias === "string" && Object.keys(value).length === 1;
}

function isJSONListItem(value: unknown): value is RGXJSONListItem {
    return isJSONAliasItem(value) || isRGXJSONToken(value, false);
}

function isJSONItemConfig(value: unknown): value is { item: RGXJSONListItem; min?: number; max?: number | null } {
    if (typeof value !== "object" || value === null || Array.isArray(value) || "$rgx" in value || !("item" in value)) return false;
    const { item, min, max, ...rest } = value as RGXJSONObject;
    return Object.keys(rest).length === 0 && isJSONListItem(item) && (min === undefined || typeof min === "number")
        && (max === undefined || max === null || typeof max === "number");
}

function parsePermutationJSONArgs(args: RGXJSONValue[]): [RGXJSONPermutationItem[], RGXJSONPermutationTokenOptions?] | string {
    if (args.length < 1 || args.length > 2) return "Expected between 1 and 2 arguments (items, options).";
    const [items, options] = args;

    if (!Array.isArray(items) || items.some(item => !isJSONItemConfig(item) && !isJSONListItem(item))) {
        return "Argument 0 (items) must be an array of JSON tokens, alias objects and item objects.";
    }

    if (options !== undefined) {
        if (typeof options !== "object" || options === null || Array.isArray(options)) return "Argument 1 (options) must be an object, if present.";
        const { min, max, separator, atomic } = options as RGXJSONObject;
        if (min !== undefined && min !== null && typeof min !== "number") return "Argument 1 (options) must have a number or null min, if present.";
        if (max !== undefined && max !== null && typeof max !== "number") return "Argument 1 (options) must have a number or null max, if present.";
        if (separator !== undefined && !isRGXJSONToken(separator, false)) return "Argument 1 (options) must have a JSON token separator, if present.";
        if (atomic !== undefined && typeof atomic !== "boolean") return "Argument 1 (options) must have a boolean atomic, if present.";
    }

    return [items as RGXJSONPermutationItem[], options as RGXJSONPermutationTokenOptions | undefined];
}

function itemFromJSON(item: RGXJSONListItem): RGXListItem {
    return isJSONAliasItem(item) ? rgxPartAlias(item.alias) : rgxTokenFromJSON(item);
}

function normalizeItem<T>(value: RGXPermutationItem<T>): RGXPermutationItemBounds<T> {
    const { item, min = 0, max = 1 } = isRGXPermutationItemConfig(value) ? value : { item: value };
    assertInRange(min, { min: 0 }, "An item's min cannot be negative");
    if (max !== null) assertInRange(max, { min: Math.floor(min) }, "An item's max cannot be less than its min");
    return { item, min: Math.floor(min), max: max === null ? null : Math.floor(max) };
}

// Matches its items in any order, each between its own min and max times (by default, at most once), with between min
// and max items in total (by default, every item). The pattern only matches a run of items (with separators between
// them), without checking how many times each one appears, so it doesn't grow with every order the items can come in.
// parse() checks the counts, walking the text with the same items.
export class RGXPermutationToken<T = unknown> extends RGXClassToken {
    items: RGXPermutationItemBounds<T>[];
    _min: number | null = null;
    _max: number | null = null;
    // The token between items, or undefined for none. (null is a token that matches nothing.)
    separator: RGXToken | undefined;
    // Whether the items and separators are matched atomically (the atomic option). Named differently from the atomic()
    // method every class token has.
    atomicItems: boolean;

    static check = createRGXClassGuardFunction(RGXPermutationToken);
    static assert = createAssertRGXClassGuardFunction(RGXPermutationToken);

    // The min option, or null for the default (see minLength()).
    get min() {
        return this._min;
    }

    set min(value: number | null) {
        if (value === null) {
            this._min = null;
            return;
        }

        assertInRange(value, { min: 0, max: this.maxLength() }, "min cannot be negative and cannot be greater than max (or the sum of the items' maximums)");
        this._min = Math.floor(value);
    }

    // The max option, or null for the default (see maxLength()).
    get max() {
        return this._max;
    }

    set max(value: number | null) {
        if (value === null) {
            this._max = null;
            return;
        }

        assertInRange(value, { min: Math.max(0, this.min ?? 0) }, "max cannot be negative and cannot be less than min");
        this._max = Math.floor(value);
    }

    constructor(items: RGXPermutationItem<T>[], { min = null, max = null, separator, atomic = true }: RGXPermutationTokenOptions = {}) {
        super();
        this.items = items.map(normalizeItem);
        this.max = max;
        this.min = min;
        this.separator = separator;
        this.atomicItems = atomic;
    }

    hasSeparator(): this is RGXPermutationToken<T> & { separator: RGXToken } {
        return this.separator !== undefined;
    }

    // The most items in total: max, or the sum of the items' own maximums, or null for no limit.
    maxLength(): number | null {
        if (this.max !== null) return this.max;
        if (this.items.some(item => item.max === null)) return null;
        return this.items.reduce((sum, item) => sum + item.max!, 0);
    }

    // The fewest items in total: min, or the number of items, or maxLength() when it is lower.
    minLength(): number {
        if (this.min !== null) return this.min;
        return Math.min(this.items.length, this.maxLength() ?? Infinity);
    }

    itemTokens(): RGXToken[] {
        return rgxItemTokens(this.items.map(({ item }) => item), "permutation items");
    }

    toRgx(): RGXToken {
        const min = this.minLength();
        const max = this.maxLength();
        if (max === 0 || this.items.length === 0) return null;

        const alternatives = this.itemTokens();
        const itemToken: RGXToken = alternatives.length === 1 ? alternatives[0]! : alternatives;
        const item = this.atomicItems ? rgxAtomic([itemToken]) : itemToken;
        if (!this.hasSeparator()) return new RGXRepeatToken(item, min, max);

        const separator = this.atomicItems ? rgxAtomic([this.separator]) : this.separator;
        const pair = new RGXGroupToken({ capturing: false }, [separator, item]);
        const list = new RGXGroupToken({ capturing: false }, [item, new RGXRepeatToken(pair, Math.max(min - 1, 0), max === null ? null : max - 1)]);
        return min === 0 ? new RGXRepeatToken(list, 0, 1) : list;
    }

    private parseSteps(flags: string): RGXWalkerStep<null>[] {
        const steps = [rgxItemParseStep(this.items.map(({ item }) => item), flags, "permutation items")];
        // Separators are matched without being recorded.
        if (this.hasSeparator()) steps.push(rgxSilentParseStep(this.separator, flags));
        return steps;
    }

    // Walks text the permutation matched, returning a capture for each item, the same way RGXListToken.parse() does.
    // Throws RGXPermutationParseFailedError as soon as an item appears more than its own max or there are more than
    // maxLength() items, and at the end if the items don't cover all of text, there are fewer than minLength(), or an
    // item appears fewer than its own min. The walker's errors are thrown when an item or separator doesn't match.
    parse(text: string, { flags = "" }: RGXPermutationParseOptions = {}): RGXCapture<T>[] {
        const min = this.minLength();
        const max = this.maxLength();
        const counts = this.items.map(() => 0);
        let captures: RGXCapture<T>[] = [];
        const fail = (message: string, position: number): never => {
            throw new RGXPermutationParseFailedError(message, text, position);
        };

        if (text !== "" && max !== 0 && this.items.length > 0) {
            const walker = new RGXWalker<null>(text, this.parseSteps(localizableRGXParseFlags(flags)));
            const stepAt = (tokenPosition: number) => {
                walker.tokenPosition = tokenPosition;
                walker.step();
            };

            while (true) {
                const start = walker.sourcePosition;
                if (max !== null && walker.captures.length >= max) fail(`The permutation has more than the maximum of ${max} items`, start);

                const count = walker.captures.length;
                stepAt(0);
                // A part's hook can stop the walker, or keep the item from being recorded.
                if (walker.stopped) break;
                if (walker.captures.length > count) {
                    // With one item, the branch is the item's own union branch.
                    const index = this.items.length === 1 ? 0 : walker.captures[walker.captures.length - 1]!.branch;
                    const bounds = this.items[index]!;
                    counts[index]!++;
                    if (bounds.max !== null && counts[index]! > bounds.max) {
                        fail(`Item ${index} appears more than its maximum of ${bounds.max} times`, start);
                    }
                }

                if (walker.atSourceEnd()) break;
                if (this.hasSeparator()) stepAt(1);
                // Items and separators that match the empty string would never finish.
                if (walker.sourcePosition === start) break;
            }

            if (!walker.atSourceEnd()) fail("The permutation doesn't match all of the text", walker.sourcePosition);
            const total = walker.captures.length;
            if (total < min) fail(`The permutation has ${total} items, fewer than the minimum of ${min}`, walker.sourcePosition);
            captures = walker.captures as RGXCapture<T>[];
        } else if (text !== "") {
            fail("The permutation doesn't match all of the text", 0);
        } else if (min > 0) {
            fail(`The permutation has 0 items, fewer than the minimum of ${min}`, 0);
        }

        this.items.forEach((bounds, index) => {
            if (counts[index]! < bounds.min) fail(`Item ${index} appears ${counts[index]} times, fewer than its minimum of ${bounds.min}`, text.length);
        });

        return captures;
    }

    clone(depth: CloneDepth = "max") {
        if (depth === 0) return this;
        const items = this.items.map(({ item, min, max }) => ({
            item: RGXPart.check(item) ? item.clone(depthDecrement(depth, 1)) : cloneRGXToken(item, depthDecrement(depth, 1)),
            min, max
        }));
        return new RGXPermutationToken<T>(items, {
            min: this.min, max: this.max, atomic: this.atomicItems,
            separator: this.hasSeparator() ? cloneRGXToken(this.separator, depthDecrement(depth, 1)) : undefined
        });
    }

    static fromJSON(json: RGXJSONClassToken): RGXPermutationToken {
        const [items, options] = rgxJSONClassArgs(json, "RGXPermutationToken", parsePermutationJSONArgs);
        return new RGXPermutationToken(
            items.map(item => isJSONItemConfig(item) ? { ...item, item: itemFromJSON(item.item) } : itemFromJSON(item)),
            options === undefined ? undefined : {
                ...options, separator: options.separator === undefined ? undefined : rgxTokenFromJSON(options.separator)
            }
        );
    }

    // Parts are stored by their alias, so a part that isn't an alias part can't be serialized. Items with the default
    // bounds are stored as the item alone.
    toJSON(): RGXJSONClassToken {
        const items = this.items.map(({ item, min, max }): RGXJSONValue => {
            let json: RGXJSONValue;
            if (!RGXPart.check(item)) {
                json = rgxTokenToJSON(item);
            } else if (item.alias === null) {
                throw new RGXNotJSONSerializableError("A permutation item part can only be serialized as an alias", item.id, "Register the part with registerRGXPartAlias and use rgxPartAlias as the item.");
            } else {
                json = { alias: item.alias };
            }
            return min === 0 && max === 1 ? json : { item: json, min, max };
        });
        const options: RGXJSONObject = { min: this.min, max: this.max, atomic: this.atomicItems };
        // Left out when there is none, since null is a token.
        if (this.hasSeparator()) options.separator = rgxTokenToJSON(this.separator);
        return createRGXJSONClassToken("RGXPermutationToken", [items, options]);
    }
}

export function rgxPermutation<T = unknown>(...args: ConstructorParameters<typeof RGXPermutationToken<T>>): RGXPermutationToken<T> {
    return new RGXPermutationToken<T>(...args);
}
