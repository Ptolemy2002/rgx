import { RGXToken, ValidRegexString } from "./types";
import { resolveRGXToken } from "./resolve";
import { rgxConcat } from "./concat";
import { CloneDepth, immutableMut, extClone, depthDecrement } from "@ptolemy2002/immutability-utils";
import { Collection } from "@ptolemy2002/ts-utils";
import { createConstructFunction, createClassGuardFunction, createAssertClassGuardFunction } from "./internal";

export type RGXTokenCollectionMode = 'union' | 'concat';
export type RGXTokenCollectionInput = RGXToken | RGXTokenCollection;

export class RGXTokenCollection implements Collection<RGXToken> {
    mode: RGXTokenCollectionMode;
    tokens: RGXToken[] = [];

    static check = createClassGuardFunction(RGXTokenCollection);
    static assert = createAssertClassGuardFunction(RGXTokenCollection);

    constructor(tokens: RGXTokenCollectionInput = [], mode: RGXTokenCollectionMode = 'concat') {
        if (tokens instanceof RGXTokenCollection) {
            this.tokens = tokens.tokens;
        } else if (Array.isArray(tokens)) {
            this.tokens = tokens;
        } else {
            this.tokens = [tokens];
        }
        
        this.mode = mode;
    }

    resolve(): ValidRegexString {
        return resolveRGXToken(this);
    }

    toRgx(): RegExp {
        let pattern: ValidRegexString;
        if (this.mode === 'union') {
            // The RegExp will already be wrapped with resolveRGXToken,
            // so we don't need to wrap it again here.
            pattern = resolveRGXToken(this.tokens, false);
        } else {
            pattern = rgxConcat(this.tokens);
        }

        return new RegExp(pattern);
    }

    getTokens(): RGXToken[] {
        return extClone(this.tokens, "max");
    }

    clone(depth: CloneDepth="max"): RGXTokenCollection {
        if (depth === 0) return this; // No cloning at depth 0, return the same instance.
        return new RGXTokenCollection(extClone(this.tokens, depthDecrement(depth)), this.mode);
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

    // ------------------ Abstract Impplementations ------------------
    toArray(): RGXToken[] {
        return this.getTokens();
    }

    get length(): number {
        return this.tokens.length;
    }

    at(index: number): RGXToken | undefined {
        return this.tokens[index];
    }

    find(predicate: (token: RGXToken, index: number, array: RGXTokenCollection) => boolean): RGXToken | undefined {
        return this.tokens.find((token, index) => predicate(token, index, this));
    }

    findIndex(predicate: (token: RGXToken, index: number, array: RGXTokenCollection) => boolean): number {
        return this.tokens.findIndex((token, index) => predicate(token, index, this));
    }

    indexOf(token: RGXToken, fromIndex?: number): number {
        return this.tokens.indexOf(token, fromIndex);
    }

    includes(token: RGXToken, fromIndex?: number): boolean {
        return this.tokens.includes(token, fromIndex);
    }

    some(predicate: (token: RGXToken, index: number, array: RGXTokenCollection) => boolean): boolean {
        return this.tokens.some((token, index) => predicate(token, index, this));
    }

    every(predicate: (token: RGXToken, index: number, array: RGXTokenCollection) => boolean): boolean {
        return this.tokens.every((token, index) => predicate(token, index, this));
    }

    forEach(callback: (token: RGXToken, index: number, array: RGXTokenCollection) => void): void {
        this.tokens.forEach((token, index) => callback(token, index, this));
    }

    map<T>(callback: (token: RGXToken, index: number, array: RGXTokenCollection) => T): T[] {
        return this.tokens.map((token, index) => callback(token, index, this));
    }

    filter(predicate: (token: RGXToken, index: number, array: RGXTokenCollection) => boolean): RGXTokenCollection {
        return immutableMut(this, clone => {
            clone.tokens = clone.tokens.filter((token, index) => predicate(token, index, this));
        });
    }

    reduce<T>(callback: (accumulator: T, token: RGXToken, index: number, array: RGXTokenCollection) => T, initialValue: T): T;
    reduce(callback: (accumulator: RGXToken, token: RGXToken, index: number, array: RGXTokenCollection) => RGXToken): RGXToken;
    reduce<T>(callback: (accumulator: T, token: RGXToken, index: number, array: RGXTokenCollection) => T, initialValue?: T): T {
        if (initialValue !== undefined) {
            return this.tokens.reduce((accumulator, token, index) => callback(accumulator, token, index, this), initialValue as T);
        }

        return (this.tokens as T[]).reduce((accumulator, token, index) => callback(accumulator, token as RGXToken, index, this)) as T;
    }

    flat(depth: number = 1): RGXTokenCollection {
        return immutableMut(this, clone => {
            // Fixing TypeScript complaining about possible infinite recursion here.
            clone.tokens = clone.tokens.flat(depth as 0);
        });
    }

    flatMap<T>(callback: (token: RGXToken, index: number, array: RGXTokenCollection) => T | T[], depth?: number): T[] {
        return this.tokens.flatMap((token, index) => callback(token, index, this)) as T[];
    }

    slice(start?: number, end?: number): RGXTokenCollection {
        return immutableMut(this, clone => {
            clone.tokens = clone.tokens.slice(start, end);
        });
    }

    concat(...others: (RGXToken | RGXTokenCollection)[]): RGXTokenCollection {
        return immutableMut(this, clone => {
            const arrays = others.map(o => o instanceof RGXTokenCollection && o.mode === this.mode ? o.tokens : Array.isArray(o) ? o : [o]);
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

    reverse(): RGXTokenCollection {
        this.tokens.reverse();
        return this;
    }

    sort(compareFn?: (a: RGXToken, b: RGXToken) => number): RGXTokenCollection {
        this.tokens.sort(compareFn);
        return this;
    }

    fill(value: RGXToken, start?: number, end?: number): RGXTokenCollection {
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

export const rgxTokenCollection = createConstructFunction(RGXTokenCollection);