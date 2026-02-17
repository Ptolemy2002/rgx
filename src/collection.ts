import { RGXConvertibleTokenOutput, RGXToken } from "./types";
import { resolveRGXToken, rgxConcat } from "./index";
import { CloneDepth, immutableMut, extClone } from "@ptolemy2002/immutability-utils";

export type RGXTokenCollectionMode = 'union' | 'concat';

export class RGXTokenCollection {
    mode: RGXTokenCollectionMode;
    tokens: RGXToken[] = [];

    constructor(tokens: RGXToken[] = [], mode: RGXTokenCollectionMode = 'concat') {
        this.tokens = tokens;
        this.mode = mode;
    }

    toRgx(): RGXConvertibleTokenOutput {
        if (this.mode === 'union') {
            return resolveRGXToken(this.tokens.map(resolveRGXToken));
        } else {
            return rgxConcat(this.tokens);
        }
    }

    getTokens(): RGXToken[] {
        return extClone(this.tokens, "max");
    }

    clone(depth: CloneDepth="max"): RGXTokenCollection {
        if (depth === 0) return this; // No cloning at depth 0, return the same instance.
        return new RGXTokenCollection(extClone(this.tokens, typeof depth === "number" ? depth - 1 : depth), this.mode);
    }

    asConcat(): RGXTokenCollection {
        if (this.mode === 'concat') return this;

        return immutableMut(this, clone => {
            clone.mode = 'concat';
        });
    }

    asUnion(): RGXTokenCollection {
        if (this.mode === 'union') return this;

        return immutableMut(this, clone => {
            clone.mode = 'union';
        });
    }

    // ------------------ Standard array properties and methods ------------------
    get length(): number {
        return this.tokens.length;
    }

    at(index: number): RGXToken | undefined {
        return this.tokens[index];
    }

    find(predicate: (token: RGXToken, index: number, array: RGXToken[]) => boolean): RGXToken | undefined {
        return this.tokens.find(predicate);
    }

    findIndex(predicate: (token: RGXToken, index: number, array: RGXToken[]) => boolean): number {
        return this.tokens.findIndex(predicate);
    }

    indexOf(token: RGXToken, fromIndex?: number): number {
        return this.tokens.indexOf(token, fromIndex);
    }

    includes(token: RGXToken, fromIndex?: number): boolean {
        return this.tokens.includes(token, fromIndex);
    }

    some(predicate: (token: RGXToken, index: number, array: RGXToken[]) => boolean): boolean {
        return this.tokens.some(predicate);
    }

    every(predicate: (token: RGXToken, index: number, array: RGXToken[]) => boolean): boolean {
        return this.tokens.every(predicate);
    }

    forEach(callback: (token: RGXToken, index: number, array: RGXToken[]) => void): void {
        this.tokens.forEach(callback);
    }

    map(callback: (token: RGXToken, index: number, array: RGXToken[]) => RGXToken): RGXTokenCollection {
        return immutableMut(this, clone => {
            clone.tokens = clone.tokens.map(callback);
        });
    }

    filter(predicate: (token: RGXToken, index: number, array: RGXToken[]) => boolean): RGXTokenCollection {
        return immutableMut(this, clone => {
            clone.tokens = clone.tokens.filter(predicate);
        });
    }

    reduce<T>(callback: (accumulator: T, token: RGXToken, index: number, array: RGXToken[]) => T, initialValue: T): T;
    reduce(callback: (accumulator: RGXToken, token: RGXToken, index: number, array: RGXToken[]) => RGXToken): RGXToken;
    reduce<T>(callback: (accumulator: T, token: RGXToken, index: number, array: RGXToken[]) => T, ...rest: [T?]): T {
        if (rest.length > 0) {
            return this.tokens.reduce(callback, rest[0] as T);
        }
        return (this.tokens as T[]).reduce(callback as (accumulator: T, token: T, index: number, array: T[]) => T);
    }

    flat(depth: number = 1): RGXTokenCollection {
        return immutableMut(this, clone => {
            // Fixing TypeScript complaining about possible infinite recursion here.
            clone.tokens = clone.tokens.flat(depth as 0);
        });
    }

    flatMap(callback: (token: RGXToken, index: number, array: RGXToken[]) => RGXToken | RGXToken[]): RGXTokenCollection {
        return immutableMut(this, clone => {
            // Fixing TypeScript complaining about possible infinite recursion here.
            clone.tokens = clone.tokens.flatMap(callback);
        });
    }

    slice(start?: number, end?: number): RGXTokenCollection {
        return immutableMut(this, clone => {
            clone.tokens = clone.tokens.slice(start, end);
        });
    }

    concat(...others: (RGXToken | RGXTokenCollection)[]): RGXTokenCollection {
        return immutableMut(this, clone => {
            const arrays = others.map(o => o instanceof RGXTokenCollection ? o.tokens : [o]);
            clone.tokens = clone.tokens.concat(...arrays.flat());
        });
    }

    push(...tokens: RGXToken[]) {
        this.tokens.push(...tokens);
    }

    pop(): RGXToken | undefined {
        return this.tokens.pop();
    }

    shift(): RGXToken | undefined {
        return this.tokens.shift();
    }

    unshift(...tokens: RGXToken[]): number {
        return this.tokens.unshift(...tokens);
    }

    splice(start: number, deleteCount?: number, ...items: RGXToken[]): RGXTokenCollection {
        return immutableMut(this, clone => {
            const removed = deleteCount === undefined
                ? this.tokens.splice(start)
                : this.tokens.splice(start, deleteCount, ...items);

            clone.tokens = removed;
        });
    }

    reverse(): this {
        this.tokens.reverse();
        return this;
    }

    sort(compareFn?: (a: RGXToken, b: RGXToken) => number): this {
        this.tokens.sort(compareFn);
        return this;
    }

    fill(value: RGXToken, start?: number, end?: number): this {
        this.tokens.fill(value, start, end);
        return this;
    }

    [Symbol.iterator](): Iterator<RGXToken> {
        return this.tokens[Symbol.iterator]();
    }

    entries(): IterableIterator<[number, RGXToken]> {
        return this.tokens.entries();
    }

    keys(): IterableIterator<number> {
        return this.tokens.keys();
    }

    values(): IterableIterator<RGXToken> {
        return this.tokens.values();
    }
}
