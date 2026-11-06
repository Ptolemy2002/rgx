import { RGXJSONClassToken, RGXJSONObject, RGXJSONToken, RGXJSONValue, RGXToken } from "src/types";
import { createRGXJSONClassToken, rgxJSONClassArgs, rgxTokenFromJSON, rgxTokenToJSON } from "src/json";
import { RGXClassToken } from "./base";
import { RGXAtomicToken } from "./atomic";
import { RGXGroupToken } from "./group";
import { RGXRepeatToken } from "./repeat";
import { assertInRange, RGXListParseFailedError, RGXNotJSONSerializableError, RGXNotSupportedError } from "src/errors";
import { isRGXJSONToken } from "src/typeGuards";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";
import { cloneRGXToken } from "src/clone";
import { RGXCapture, RGXPart, rgxPartAlias, RGXWalker, RGXWalkerStep } from "src/walker";

// An item of a list: a part, whose options (such as transform and validate) apply to the item when the list is parsed,
// or a plain token, whose items are the text it matched. A string is text to match, like everywhere else; refer to a
// registered part with an alias part (see rgxPartAlias).
export type RGXListItem<T = unknown> = RGXPart<any, any, T> | RGXToken;

export type RGXListTokenOptions = {
    min?: number;
    max?: number | null;
    // Whether a separator may follow the last item.
    trailing?: boolean;
    // Whether the items and separators are matched atomically, the way a walker matches them (see RGXAtomicToken).
    atomic?: boolean;
};

export type RGXListParseOptions = {
    // The flags the list is matched with. Only the localizable flags (i, m and s) change what the walker matches.
    flags?: string;
};

// An item alternative in JSON: a JSON token, or the alias of a registered part.
export type RGXJSONListItem = RGXJSONToken | { alias: string };

function isJSONAliasItem(value: unknown): value is { alias: string } {
    return typeof value === "object" && value !== null && !Array.isArray(value) && !("$rgx" in value)
        && typeof (value as { alias?: unknown }).alias === "string" && Object.keys(value).length === 1;
}

function parseListJSONArgs(args: RGXJSONValue[]): [RGXJSONListItem[], RGXJSONToken, RGXListTokenOptions?] | string {
    if (args.length < 2 || args.length > 3) return "Expected between 2 and 3 arguments (items, separator, options).";
    const [items, separator, options] = args;

    if (!Array.isArray(items) || items.some(item => !isJSONAliasItem(item) && !isRGXJSONToken(item, false))) {
        return "Argument 0 (items) must be an array of JSON tokens and alias objects.";
    }
    if (!isRGXJSONToken(separator, false)) return "Argument 1 (separator) must be a JSON token.";

    if (options !== undefined) {
        if (typeof options !== "object" || options === null || Array.isArray(options)) return "Argument 2 (options) must be an object, if present.";
        const { min, max, trailing, atomic } = options as RGXJSONObject;
        if (min !== undefined && typeof min !== "number") return "Argument 2 (options) must have a number min, if present.";
        if (max !== undefined && max !== null && typeof max !== "number") return "Argument 2 (options) must have a number or null max, if present.";
        if (trailing !== undefined && typeof trailing !== "boolean") return "Argument 2 (options) must have a boolean trailing, if present.";
        if (atomic !== undefined && typeof atomic !== "boolean") return "Argument 2 (options) must have a boolean atomic, if present.";
    }

    return [items as RGXJSONListItem[], separator, options as RGXListTokenOptions | undefined];
}

function localizableFlags(flags: string): string {
    return [..."ims"].filter(flag => flags.includes(flag)).join("");
}

// Matches a list of items with a separator between each one, such as comma-separated values, with between min and max
// items. Only the items and separators are matched, without capturing anything, so the token can be used anywhere.
// To get the items themselves, parse the text the list matched with parse(), which walks it with the same items.
export class RGXListToken<T = unknown> extends RGXClassToken {
    items: RGXListItem<T>[];
    separator: RGXToken;
    _min: number;
    _max: number | null = null;
    trailing: boolean;
    // Whether the items and separators are matched atomically (the atomic option). Named differently from the atomic()
    // method every class token has.
    atomicItems: boolean;

    static check = createRGXClassGuardFunction(RGXListToken);
    static assert = createAssertRGXClassGuardFunction(RGXListToken);

    get min() {
        return this._min;
    }

    set min(value: number) {
        assertInRange(value, { min: 0, max: this.max }, "min cannot be negative and cannot be greater than max");
        this._min = Math.floor(value);
    }

    get max() {
        return this._max;
    }

    set max(value: number | null) {
        if (value === null) {
            this._max = null;
            return;
        }

        assertInRange(value, { min: Math.max(0, this.min) }, "max cannot be negative and cannot be less than min");
        this._max = Math.floor(value);
    }

    // An array of items lists the alternatives an item can be. Anything else is the only alternative.
    constructor(items: RGXListItem<T> | RGXListItem<T>[], separator: RGXToken, { min = 1, max = null, trailing = false, atomic = true }: RGXListTokenOptions = {}) {
        super();
        this.items = Array.isArray(items) ? [...items] : [items];
        this.separator = separator;
        this._min = 0;
        this.max = max;
        this.min = min;
        this.trailing = trailing;
        this.atomicItems = atomic;
    }

    // The token each item alternative is matched with. Dynamic parts produce their token from a walker's state, which a
    // pattern doesn't have.
    itemTokens(): RGXToken[] {
        return this.items.map(item => {
            if (!RGXPart.check(item)) return item;
            const part = item.target();
            if (part.isDynamic()) throw new RGXNotSupportedError("Dynamic parts as list items", "A list item's token has to be known without a walker.");
            return part.token as RGXToken;
        });
    }

    toRgx(): RGXToken {
        if (this.max === 0) return null;

        const alternatives = this.itemTokens();
        const itemToken: RGXToken = alternatives.length === 1 ? alternatives[0]! : alternatives;
        const item = this.atomicItems ? new RGXAtomicToken([itemToken]) : itemToken;
        const separator = this.atomicItems ? new RGXAtomicToken([this.separator]) : this.separator;

        const restMin = Math.max(this.min - 1, 0);
        const restMax = this.max === null ? null : this.max - 1;
        const body: RGXToken[] = [item, new RGXRepeatToken(new RGXGroupToken({ capturing: false }, [separator, item]), restMin, restMax)];
        if (this.trailing) body.push(new RGXRepeatToken(separator, 0, 1));

        const list = new RGXGroupToken({ capturing: false }, body);
        return this.min === 0 ? new RGXRepeatToken(list, 0, 1) : list;
    }

    // The walker steps the items are parsed with. With flags, each token is put in a group that sets them.
    private parseSteps(flags: string): [RGXWalkerStep<null>, RGXPart<null>] {
        const wrap = (token: RGXToken) => flags === "" ? token : new RGXGroupToken({ capturing: false, flags }, [token]);
        const tokens = this.itemTokens();

        const alternatives = this.items.map((item, i): RGXWalkerStep<null> => {
            if (!RGXPart.check(item)) return wrap(tokens[i]);
            if (flags === "") return item as RGXPart<null>;

            const part = item.target() as RGXPart<null, unknown, unknown>;
            return new RGXPart<null, unknown, unknown>(wrap(tokens[i]), {
                id: part.id ?? undefined,
                rawTransform: part.rawTransform,
                transform: part.transform,
                validate: (capture, context) => { part.validate(capture, { part, walker: context.walker }); return true; },
                beforeCapture: part.beforeCapture,
                afterCapture: part.afterCapture,
                afterFailure: part.afterFailure,
                afterValidationFailure: part.afterValidationFailure,
                afterLoss: part.afterLoss,
            });
        });

        // Separators are matched without being recorded.
        const separator = new RGXPart<null>(wrap(this.separator), { beforeCapture: () => "silent" });
        return [alternatives.length === 1 ? alternatives[0]! : alternatives, separator];
    }

    // Walks text the list matched, returning a capture for each item: its raw text and value (from the item's part, if
    // it is one), its position in text, and the index of the item alternative that matched it as its branch. Throws
    // the walker's errors if an item or separator doesn't match where one is expected, or an item fails validation, and
    // RGXListParseFailedError if the list doesn't cover all of text or has fewer items than min.
    parse(text: string, { flags = "" }: RGXListParseOptions = {}): RGXCapture<T>[] {
        if (this.max === 0 || (this.min === 0 && text === "")) {
            if (text !== "") throw new RGXListParseFailedError("The list doesn't match all of the text", text, 0);
            return [];
        }

        const [item, separator] = this.parseSteps(localizableFlags(flags));
        const walker = new RGXWalker<null>(text, [item, separator]);

        while (true) {
            const start = walker.sourcePosition;
            walker.tokenPosition = 0;
            walker.step();
            // A part's hook can stop the walker.
            if (walker.stopped || walker.atSourceEnd()) break;

            // With the most items it can have, only a trailing separator can follow.
            const full = this.max !== null && walker.captures.length >= this.max;
            if (full && !this.trailing) break;

            walker.step();
            if (full || (walker.atSourceEnd() && this.trailing)) break;
            // Items and separators that match the empty string would never finish.
            if (walker.sourcePosition === start) break;
        }

        if (!walker.atSourceEnd()) throw new RGXListParseFailedError("The list doesn't match all of the text", text, walker.sourcePosition);
        if (walker.captures.length < this.min) {
            throw new RGXListParseFailedError(`The list has ${walker.captures.length} items, fewer than the minimum of ${this.min}`, text, walker.sourcePosition);
        }

        return walker.captures as RGXCapture<T>[];
    }

    clone(depth: CloneDepth = "max") {
        if (depth === 0) return this;
        const items = this.items.map(item => RGXPart.check(item) ? item.clone(depthDecrement(depth, 1)) : cloneRGXToken(item, depthDecrement(depth, 1)));
        return new RGXListToken<T>(items, cloneRGXToken(this.separator, depthDecrement(depth, 1)), {
            min: this.min, max: this.max, trailing: this.trailing, atomic: this.atomicItems
        });
    }

    static fromJSON(json: RGXJSONClassToken): RGXListToken {
        const [items, separator, options] = rgxJSONClassArgs(json, "RGXListToken", parseListJSONArgs);
        return new RGXListToken(
            items.map(item => isJSONAliasItem(item) ? rgxPartAlias(item.alias) : rgxTokenFromJSON(item)),
            rgxTokenFromJSON(separator),
            options
        );
    }

    // Parts are stored by their alias, so a part that isn't an alias part can't be serialized.
    toJSON(): RGXJSONClassToken {
        const items = this.items.map((item): RGXJSONValue => {
            if (!RGXPart.check(item)) return rgxTokenToJSON(item);
            if (item.alias === null) {
                throw new RGXNotJSONSerializableError("A list item part can only be serialized as an alias", item.id, "Register the part with registerRGXPartAlias and use rgxPartAlias as the item.");
            }
            return { alias: item.alias };
        });
        const options = { min: this.min, max: this.max, trailing: this.trailing, atomic: this.atomicItems };
        return createRGXJSONClassToken("RGXListToken", [items, rgxTokenToJSON(this.separator), options]);
    }
}

export function rgxList<T = unknown>(...args: ConstructorParameters<typeof RGXListToken<T>>): RGXListToken<T> {
    return new RGXListToken<T>(...args);
}
