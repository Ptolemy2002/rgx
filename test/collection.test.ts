import { RGXTokenCollection, rgxTokenCollection, RGXToken } from "src/index";
import { ConstructFunction } from "src/internal";

function constructionTest(constructor: ConstructFunction<typeof RGXTokenCollection>) {
    it('defaults to empty tokens when no tokens are specified', () => {
        const collection = constructor();
        expect(collection.getTokens()).toEqual([]);
        expect(collection.length).toBe(0);
    });

    it('defaults to concat mode when no mode is specified', () => {
        const collection = constructor(['a', 'b']);
        expect(collection.mode).toBe('concat');
    });

    it('accepts tokens and mode', () => {
        const collection = constructor(['a', 'b'], 'union');
        expect(collection.getTokens()).toEqual(['a', 'b']);
        expect(collection.mode).toBe('union');
    });

    it('accepts a single token as tokens argument', () => {
        const collection = constructor('a');
        expect(collection.getTokens()).toEqual(['a']);
    });
}

describe('RGXTokenCollection', () => {
    describe('constructor', () => {
        constructionTest((...args) => new RGXTokenCollection(...args));
    });

    describe('construct function', () => {
        constructionTest(rgxTokenCollection);
    });

    describe('getTokens', () => {
        it('performs deep clone of tokens on getTokens call', () => {
            const tokens = ['a', 'b', ['c']];
            const collection = new RGXTokenCollection(tokens);

            expect(collection.getTokens()).toEqual(tokens);
            expect(collection.getTokens()).not.toBe(tokens);

            expect(collection.getTokens()[2]).toEqual(['c']);
            expect(collection.getTokens()[2]).not.toBe(tokens[2]);
        });
    });

    describe('clone', () => {
        it('performs deep clone of tokens on clone', () => {
            const collection = new RGXTokenCollection(['a', 'b', ['c']]);
            const tokens = collection.tokens; // We don't need to clone here
            const cloned = collection.clone();

            expect(cloned.getTokens()).toEqual(tokens);
            expect(cloned.getTokens()).not.toBe(tokens);

            expect(cloned.getTokens()[2]).toEqual(['c']);
            expect(cloned.getTokens()[2]).not.toBe(tokens[2]);
        });

        it('preserves mode on clone', () => {
            const collection = new RGXTokenCollection(['a', 'b'], 'union');
            const cloned = collection.clone();

            expect(cloned.mode).toBe('union');
        });

        it('returns the same instance when cloning at depth 0', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            const cloned = collection.clone(0);

            expect(cloned).toBe(collection);
        });

        it('performs shallow clone when cloning at depth 1', () => {
            const collection = new RGXTokenCollection(['a', 'b', ['c']]);
            const tokens = collection.tokens;
            const cloned = collection.clone(1);

            expect(cloned.getTokens()).toEqual(tokens);
            expect(cloned.tokens).toBe(tokens);
        });
    });

    describe('asConcat', () => {
        it('clones itself and switches to concat mode on asConcat call', () => {
            const collection = new RGXTokenCollection(['a', 'b'], 'union');
            const concat = collection.asConcat();

            expect(concat).not.toBe(collection);
            expect(concat.mode).toBe('concat');
            expect(collection.mode).toBe('union');
        });

        it('returns itself if asConcat is called on a collection already in concat mode', () => {
            const collection = new RGXTokenCollection(['a', 'b'], 'concat');
            const concat = collection.asConcat();

            expect(concat).toBe(collection);
        });
    });

    describe('asUnion', () => {
        it('clones itself and switches to union mode on asUnion call', () => {
            const collection = new RGXTokenCollection(['a', 'b'], 'concat');
            const union = collection.asUnion();

            expect(union).not.toBe(collection);
            expect(union.mode).toBe('union');
            expect(collection.mode).toBe('concat');
        });

        it('returns itself if asUnion is called on a collection already in union mode', () => {
            const collection = new RGXTokenCollection(['a', 'b'], 'union');
            const union = collection.asUnion();

            expect(union).toBe(collection);
        });
    });

    describe('toRgx', () => {
        it('correctly converts when in union mode', () => {
            const collection = new RGXTokenCollection(['a', 'b'], 'union');
            const result = collection.toRgx();

            expect(result.source).toEqual('a|b');
        });

        it('correctly converts when in concat mode', () => {
            const collection = new RGXTokenCollection(['a', 'b'], 'concat');
            const result = collection.toRgx();

            expect(result.source).toEqual('ab');
        });
    });

    describe('length', () => {
        it('returns the number of tokens', () => {
            expect(new RGXTokenCollection(['a', 'b', 'c']).length).toBe(3);
        });

        it('returns 0 for empty collection', () => {
            expect(new RGXTokenCollection([]).length).toBe(0);
        });
    });

    describe('at', () => {
        it('returns the token at the given index', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c']);
            expect(collection.at(0)).toBe('a');
            expect(collection.at(1)).toBe('b');
            expect(collection.at(2)).toBe('c');
        });

        it('returns undefined for out-of-bounds index', () => {
            const collection = new RGXTokenCollection(['a']);
            expect(collection.at(5)).toBeUndefined();
        });
    });

    describe('find', () => {
        it('returns the first token matching the predicate', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c', 'bar']);
            expect(collection.find(t => typeof t === 'string' && t.startsWith('b'))).toBe('b');
        });

        it('returns undefined if no token matches', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            expect(collection.find(t => t === 'z')).toBeUndefined();
        });
    });

    describe('findIndex', () => {
        it('returns the index of the first token matching the predicate', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c', 'b']);
            expect(collection.findIndex(t => t === 'b')).toBe(1);
        });

        it('returns -1 if no token matches', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            expect(collection.findIndex(t => t === 'z')).toBe(-1);
        });
    });

    describe('indexOf', () => {
        it('returns the first index of the given token', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c', 'b']);
            expect(collection.indexOf('b')).toBe(1);
        });

        it('returns -1 if the token is not found', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            expect(collection.indexOf('z')).toBe(-1);
        });

        it('respects the fromIndex parameter', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'a']);
            expect(collection.indexOf('a', 1)).toBe(2);
        });
    });

    describe('includes', () => {
        it('returns true if the token exists', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            expect(collection.includes('a')).toBe(true);
        });

        it('returns false if the token does not exist', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            expect(collection.includes('z')).toBe(false);
        });

        it('respects the fromIndex parameter', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            expect(collection.includes('a', 1)).toBe(false);
        });
    });

    describe('some', () => {
        it('returns true if any token matches', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            expect(collection.some(t => t === 'b')).toBe(true);
        });

        it('returns false if no token matches', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            expect(collection.some(t => t === 'z')).toBe(false);
        });
    });

    describe('every', () => {
        it('returns true if all tokens match', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            expect(collection.every(t => typeof t === 'string')).toBe(true);
        });

        it('returns false if any token does not match', () => {
            const collection = new RGXTokenCollection(['a', 42]);
            expect(collection.every(t => typeof t === 'string')).toBe(false);
        });
    });

    describe('forEach', () => {
        it('calls the callback for each token', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c']);
            const results: string[] = [];
            collection.forEach(t => results.push(t as string));
            expect(results).toEqual(['a', 'b', 'c']);
        });

        it('provides correct index and array arguments', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            const indices: number[] = [];
            const arrays: RGXToken[][] = [];
            collection.forEach((t, i, c) => {
                indices.push(i);
                arrays.push(c.toArray());
            });

            expect(indices).toEqual([0, 1]);

            expect(arrays.length).toBe(2);
            expect(arrays[0]).toEqual(collection.tokens);
            expect(arrays[1]).toEqual(collection.tokens);
        });
    });

    describe('map', () => {
        it('returns a new collection with mapped tokens', () => {
            const collection = new RGXTokenCollection(['a', 'b'], 'union');
            const mapped = collection.map(t => (t as string).toUpperCase());

            expect(mapped).not.toBe(collection);
            expect(mapped).toEqual(['A', 'B']);
        });

        it('does not mutate the original', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            collection.map(t => (t as string).toUpperCase());
            expect(collection.getTokens()).toEqual(['a', 'b']);
        });
    });

    describe('filter', () => {
        it('returns a new collection with filtered tokens', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c']);
            const filtered = collection.filter(t => t !== 'b');

            expect(filtered).not.toBe(collection);
            expect(filtered.getTokens()).toEqual(['a', 'c']);
        });

        it('preserves mode', () => {
            const collection = new RGXTokenCollection(['a', 'b'], 'union');
            const filtered = collection.filter(() => true);
            expect(filtered.mode).toBe('union');
        });

        it('does not mutate the original', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c']);
            collection.filter(t => t !== 'b');
            expect(collection.getTokens()).toEqual(['a', 'b', 'c']);
        });
    });

    describe('reduce', () => {
        it('reduces with an initial value', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c']);
            const result = collection.reduce((acc, t) => acc + (t as string), '');
            expect(result).toBe('abc');
        });

        it('reduces without an initial value', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c']);
            const result = collection.reduce((acc, t) => (acc as string) + (t as string));
            expect(result).toBe('abc');
        });
    });

    describe('flat', () => {
        it('flattens nested arrays by one level by default', () => {
            const collection = new RGXTokenCollection(['a', ['b', 'c']]);
            const flattened = collection.flat();

            expect(flattened.getTokens()).toEqual(['a', 'b', 'c']);
        });

        it('does not mutate the original', () => {
            const collection = new RGXTokenCollection(['a', ['b', 'c']]);
            collection.flat();
            expect(collection.getTokens()).toEqual(['a', ['b', 'c']]);
        });

        it('preserves mode', () => {
            const collection = new RGXTokenCollection(['a', ['b']], 'union');
            expect(collection.flat().mode).toBe('union');
        });
    });

    describe('flatMap', () => {
        it('maps and flattens tokens', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            const result = collection.flatMap(t => [t, 'x']);

            expect(result).toEqual(['a', 'x', 'b', 'x']);
        });

        it('does not mutate the original', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            collection.flatMap(t => [t, 'x']);
            expect(collection.getTokens()).toEqual(['a', 'b']);
        });
    });

    describe('slice', () => {
        it('returns a new collection with sliced tokens', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c', 'd']);
            const sliced = collection.slice(1, 3);

            expect(sliced).not.toBe(collection);
            expect(sliced.getTokens()).toEqual(['b', 'c']);
        });

        it('works with no arguments (copies all)', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            const sliced = collection.slice();
            expect(sliced.getTokens()).toEqual(['a', 'b']);
        });

        it('does not mutate the original', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c']);
            collection.slice(0, 1);
            expect(collection.getTokens()).toEqual(['a', 'b', 'c']);
        });

        it('preserves mode', () => {
            const collection = new RGXTokenCollection(['a', 'b'], 'union');
            expect(collection.slice(0, 1).mode).toBe('union');
        });
    });

    describe('concat', () => {
        it('concatenates tokens from another collection', () => {
            const a = new RGXTokenCollection(['a', 'b']);
            const b = new RGXTokenCollection(['c', 'd']);
            const result = a.concat(b);

            expect(result.getTokens()).toEqual(['a', 'b', 'c', 'd']);
        });

        it('concatenates individual tokens', () => {
            const collection = new RGXTokenCollection(['a']);
            const result = collection.concat('b', 'c');

            expect(result.getTokens()).toEqual(['a', 'b', 'c']);
        });

        it('concatenates arrays of tokens', () => {
            const collection = new RGXTokenCollection(['a']);
            const result = collection.concat(['b', 'c']);

            expect(result.getTokens()).toEqual(['a', 'b', 'c']);
        });

        it('does not mutate the original', () => {
            const collection = new RGXTokenCollection(['a']);
            collection.concat('b');
            expect(collection.getTokens()).toEqual(['a']);
        });

        it('preserves mode', () => {
            const collection = new RGXTokenCollection(['a'], 'union');
            expect(collection.concat('b').mode).toBe('union');
        });
    });

    describe('push', () => {
        it('adds tokens to the end', () => {
            const collection = new RGXTokenCollection(['a']);
            collection.push('b', 'c');
            expect(collection.getTokens()).toEqual(['a', 'b', 'c']);
        });
    });

    describe('pop', () => {
        it('removes and returns the last token', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            expect(collection.pop()).toBe('b');
            expect(collection.getTokens()).toEqual(['a']);
        });

        it('returns undefined for empty collection', () => {
            const collection = new RGXTokenCollection([]);
            expect(collection.pop()).toBeUndefined();
        });
    });

    describe('shift', () => {
        it('removes and returns the first token', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            expect(collection.shift()).toBe('a');
            expect(collection.getTokens()).toEqual(['b']);
        });

        it('returns undefined for empty collection', () => {
            const collection = new RGXTokenCollection([]);
            expect(collection.shift()).toBeUndefined();
        });
    });

    describe('unshift', () => {
        it('adds tokens to the beginning and returns new length', () => {
            const collection = new RGXTokenCollection(['c']);
            const length = collection.unshift('a', 'b');
            expect(length).toBe(3);
            expect(collection.getTokens()).toEqual(['a', 'b', 'c']);
        });
    });

    describe('splice', () => {
        it('removes elements and returns them as a new collection', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c', 'd']);
            const removed = collection.splice(1, 2);

            expect(removed.getTokens()).toEqual(['b', 'c']);
        });

        it('inserts elements when items are provided', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c']);
            collection.splice(1, 1, 'x', 'y');
            expect(collection.getTokens()).toEqual(['a', 'x', 'y', 'c']);
        });

        it('removes all from start when deleteCount is omitted', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c']);
            const removed = collection.splice(1);
            expect(removed.getTokens()).toEqual(['b', 'c']);
        });
    });

    describe('reverse', () => {
        it('reverses tokens in place and returns itself', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c']);
            const result = collection.reverse();

            expect(result).toBe(collection);
            expect(collection.getTokens()).toEqual(['c', 'b', 'a']);
        });
    });

    describe('sort', () => {
        it('sorts tokens in place and returns itself', () => {
            const collection = new RGXTokenCollection(['c', 'a', 'b']);
            const result = collection.sort();

            expect(result).toBe(collection);
            expect(collection.getTokens()).toEqual(['a', 'b', 'c']);
        });

        it('accepts a custom comparator', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c']);
            collection.sort((a, b) => (a as string) > (b as string) ? -1 : 1);
            expect(collection.getTokens()).toEqual(['c', 'b', 'a']);
        });
    });

    describe('fill', () => {
        it('fills tokens with a value and returns itself', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c']);
            const result = collection.fill('x');

            expect(result).toBe(collection);
            expect(collection.getTokens()).toEqual(['x', 'x', 'x']);
        });

        it('accepts start and end parameters', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c', 'd']);
            collection.fill('x', 1, 3);
            expect(collection.getTokens()).toEqual(['a', 'x', 'x', 'd']);
        });
    });

    describe('Symbol.iterator', () => {
        it('allows iteration with for...of', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c']);
            const results: string[] = [];
            for (const token of collection) {
                results.push(token as string);
            }
            expect(results).toEqual(['a', 'b', 'c']);
        });

        it('allows spread into an array', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            expect([...collection]).toEqual(['a', 'b']);
        });
    });

    describe('entries', () => {
        it('returns an iterator of [index, token] pairs', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            expect([...collection.entries()]).toEqual([[0, 'a'], [1, 'b']]);
        });
    });

    describe('keys', () => {
        it('returns an iterator of indices', () => {
            const collection = new RGXTokenCollection(['a', 'b', 'c']);
            expect([...collection.keys()]).toEqual([0, 1, 2]);
        });
    });

    describe('values', () => {
        it('returns an iterator of tokens', () => {
            const collection = new RGXTokenCollection(['a', 'b']);
            expect([...collection.values()]).toEqual(['a', 'b']);
        });
    });
});