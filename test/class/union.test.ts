import { RGXClassUnionToken, RGXGroupToken, rgxClassInit, rgxClassUnion, expandRgxUnionTokens, removeRgxUnionDuplicates, RGXClassToken } from "src/class";
import { RGXInvalidTokenError } from "src/errors";
import { ConstructFunction } from "src/internal";

class TestClassToken extends RGXClassToken {
    toRgx() {
        return "test";
    }

    clone() {
        return new TestClassToken();
    }
}

const isRgxClassUnionToken = RGXClassUnionToken.check;
export const assertRgxClassUnionToken = RGXClassUnionToken.assert;

function constructionTest(constructor: ConstructFunction<typeof RGXClassUnionToken>) {
    it("constructs an instance of RGXClassUnionToken", () => {
        const instance = constructor();
        expect(instance).toBeInstanceOf(RGXClassUnionToken);
    });

    it("correctly initializes with no parameters", () => {
        const instance = constructor();
        expect(instance.tokens).toEqual([]);
    });

    it("correctly initializes with an empty array", () => {
        const instance = constructor([]);
        expect(instance.tokens).toEqual([]);
    });

    it("correctly initializes with an array of tokens", () => {
        const tokens = ["a", "b", "c"];
        const instance = constructor(tokens);
        expect(instance.tokens).toEqual(tokens);
    });

    it("expands another union", () => {
        const tokens = ["a", "b", "c"];
        const instance = constructor(new RGXClassUnionToken(tokens));
        expect(instance.tokens).toEqual(tokens);
    });

    it("keeps a single non-union token as one alternative", () => {
        const group = new RGXGroupToken({ capturing: false }, ["a", "b", "c"]);
        const instance = constructor(group);
        expect(instance.tokens).toEqual([group]);
    });
}

describe("RGXClassUnionToken", () => {
    describe("type guards", () => {
        it("accepts instances of RGXClassUnionToken", () => {
            const instance = new RGXClassUnionToken();
            expect(isRgxClassUnionToken(instance)).toBe(true);
            expect(() => assertRgxClassUnionToken(instance)).not.toThrow();
        });

        it("rejects non-instances of RGXClassUnionToken", () => {
            const instance = new TestClassToken();
            expect(isRgxClassUnionToken({})).toBe(false);
            expect(isRgxClassUnionToken("test")).toBe(false);
            expect(isRgxClassUnionToken(123)).toBe(false);
            expect(isRgxClassUnionToken(null)).toBe(false);
            expect(isRgxClassUnionToken(undefined)).toBe(false);
            expect(isRgxClassUnionToken(instance)).toBe(false);

            expect(() => assertRgxClassUnionToken({})).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxClassUnionToken("test")).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxClassUnionToken(123)).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxClassUnionToken(null)).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxClassUnionToken(undefined)).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxClassUnionToken(instance)).toThrow(RGXInvalidTokenError);
        });
    });

    describe("constructor", () => {
        constructionTest((...args) => new RGXClassUnionToken(...args));
    });

    describe("construct function", () => {
        constructionTest(rgxClassUnion);
    });


    it("resolves correctly", () => {
        const instance = new RGXClassUnionToken(["a", "b"]);
        expect(instance.resolve()).toBe("(?:a|b)");
    });

    describe("add", () => {
        it("adds a token to the union", () => {
            const instance = new RGXClassUnionToken(["a"]);
            instance.add("b");
            expect(instance.tokens).toEqual(["a", "b"]);
        });

        it("adds a token to the beginning of the union when pos is 'prefix'", () => {
            const instance = new RGXClassUnionToken(["a"]);
            instance.add("b", 'prefix');
            expect(instance.tokens).toEqual(["b", "a"]);
        });

        it("adds multiple tokens to the union", () => {
            const instance = new RGXClassUnionToken(["a"]);
            instance.add(["b", "c"]);
            expect(instance.tokens).toEqual(["a", "b", "c"]);
        });

        it("adds multiple tokens to the union when pos is 'prefix'", () => {
            const instance = new RGXClassUnionToken(["a"]);
            instance.add("b", 'prefix');
            instance.add("c", 'prefix');
            expect(instance.tokens).toEqual(["c", "b", "a"]);
        });

        it("expands an array", () => {
            const instance = new RGXClassUnionToken(["a"]);
            instance.add(["b", "c"]);
            expect(instance.tokens).toEqual(["a", "b", "c"]);
        });

        it("does not expand a group", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const group = new RGXGroupToken({ capturing: false }, ["b", "c"]);
            instance.add(group);
            expect(instance.tokens).toEqual(["a", group]);
        });

        it("flattens nested unions when adding", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherUnion = new RGXClassUnionToken(["b", "c"]);
            instance.add(otherUnion);
            expect(instance.tokens).toEqual(["a", "b", "c"]);
        });

        it("removes direct repeats when adding", () => {
            const instance = new RGXClassUnionToken(["a"]);
            instance.add("a");
            expect(instance.tokens).toEqual(["a"]);
        });

        it("removes nested repeats when adding", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherUnion = new RGXClassUnionToken(["a", "b"]);
            instance.add(otherUnion);
            expect(instance.tokens).toEqual(["a", "b"]);
        });

        it("mutates the original instance", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const result = instance.add("b");
            expect(result).toBe(instance);
            expect(instance.tokens).toEqual(["a", "b"]);
        });
    });

    describe("concat", () => {
        it("concatenates another union to the end", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherUnion = new RGXClassUnionToken(["b", "c"]);
            instance.concat('suffix', otherUnion);
            expect(instance.tokens).toEqual(["a", "b", "c"]);
        });

        it("concatenates another union to the beginning", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherUnion = new RGXClassUnionToken(["b", "c"]);
            instance.concat('prefix', otherUnion);
            expect(instance.tokens).toEqual(["b", "c", "a"]);
        });

        it("expands arrays when concatenating", () => {
            const instance = new RGXClassUnionToken(["a"]);
            instance.concat('suffix', ["b", "c"]);
            expect(instance.tokens).toEqual(["a", "b", "c"]);
        });

        it("does not expand groups when concatenating", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const group = new RGXGroupToken({ capturing: false }, ["b", "c"]);
            instance.concat('suffix', group);
            expect(instance.tokens).toEqual(["a", group]);
        });

        it("removes direct repeats when concatenating", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherUnion = new RGXClassUnionToken(["a", "b"]);
            instance.concat('suffix', otherUnion);
            expect(instance.tokens).toEqual(["a", "b"]);
        });

        it("removes nested repeats when concatenating", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherUnion1 = new RGXClassUnionToken(["a", "b"]);
            const otherUnion2 = new RGXClassUnionToken(["b", "c"]);
            instance.concat('suffix', otherUnion1, otherUnion2);
            expect(instance.tokens).toEqual(["a", "b", "c"]);
        });

        it("mutates the original instance", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherUnion = new RGXClassUnionToken(["b", "c"]);
            const result = instance.concat('suffix', otherUnion);
            expect(result).toBe(instance);
            expect(instance.tokens).toEqual(["a", "b", "c"]);
        });

        it("defaults to suffix concatenation", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherUnion = new RGXClassUnionToken(["b", "c"]);
            instance.concat(undefined, otherUnion);
            expect(instance.tokens).toEqual(["a", "b", "c"]);
        });
    });

    describe("cleanTokens", () => {
        it("removes direct repeats", () => {
            const instance = new RGXClassUnionToken();
            // Directly modify tokens, since a clean call happens on creation.
            instance.tokens.push("a", "b", "a");
            instance.cleanTokens();
            expect(instance.tokens).toEqual(["a", "b"]);
        });

        it("removes nested repeats", () => {
            const instance = new RGXClassUnionToken();
            // Directly modify tokens, since a clean call happens on creation.
            instance.tokens.push("a", new RGXClassUnionToken(["a", "b"]));
            instance.cleanTokens();
            expect(instance.tokens).toEqual(["a", "b"]);
        });

        it("expands nested arrays", () => {
            const instance = new RGXClassUnionToken();
            // Directly modify tokens, since a clean call happens on creation.
            instance.tokens.push(["a", "b"]);
            instance.cleanTokens();
            expect(instance.tokens).toEqual(["a", "b"]);
        });

        it("does not expand nested groups", () => {
            const instance = new RGXClassUnionToken();
            const group = new RGXGroupToken({ capturing: false }, ["a", "b"]);
            // Directly modify tokens, since a clean call happens on creation.
            instance.tokens.push(group);
            instance.cleanTokens();
            expect(instance.tokens).toEqual([group]);
        });

        it("mutates the original instance", () => {
            const instance = new RGXClassUnionToken();
            // Directly modify tokens, since a clean call happens on creation.
            instance.tokens.push("a", "b", "a");
            const result = instance.cleanTokens();
            expect(result).toBe(instance);
            expect(instance.tokens).toEqual(["a", "b"]);
        }); 
    });

    describe("toRgx", () => {
        it("returns a RegExp", () => {
            const instance = new RGXClassUnionToken(["a", "b"]);
            const result = instance.toRgx();
            expect(result).toBeInstanceOf(RegExp);
        });

        it("returns a RegExp with the correct source", () => {
            const instance = new RGXClassUnionToken(["a", "b"]);
            const result = instance.toRgx();
            expect(result.source).toBe("a|b");
        });
    });

    describe("or", () => {
        it("combines correctly with another class union token", () => {
            rgxClassInit(); // Ensure the or method is patched before testing

            const token1 = new RGXClassUnionToken(["a", "b"]);
            const token2 = new RGXClassUnionToken(["b", "c"]);
            const result = token1.or(token2);
            expect(result).toBeInstanceOf(RGXClassUnionToken);
            expect((result as RGXClassUnionToken).tokens).toEqual(["a", "b", "c"]);
        });
    });

    describe("clone", () => {
        it("does nothing when depth is 0", () => {
            const instance = new RGXClassUnionToken(["a", "b"]);
            const clone = instance.clone(0);
            expect(clone).toBe(instance);
        });

        it("preserves properties", () => {
            const instance = new RGXClassUnionToken(["a", "b"]);
            const clone = instance.clone();
            expect(clone).not.toBe(instance);
            expect(clone.tokens).toEqual(instance.tokens);
        });
    });
});

describe("expandRgxUnionTokens", () => {
    it("returns a flat array from plain tokens", () => {
        const result = expandRgxUnionTokens("a", "b", "c");
        expect(result).toEqual(["a", "b", "c"]);
    });

    it("expands nested arrays", () => {
        const result = expandRgxUnionTokens("a", ["b", "c"]);
        expect(result).toEqual(["a", "b", "c"]);
    });

    it("does not expand groups", () => {
        const group = new RGXGroupToken({ capturing: false }, ["b", "c"]);
        const result = expandRgxUnionTokens("a", group);
        expect(result).toEqual(["a", group]);
    });

    it("expands RGXClassUnionToken instances", () => {
        const union = new RGXClassUnionToken(["b", "c"]);
        const result = expandRgxUnionTokens("a", union);
        expect(result).toEqual(["a", "b", "c"]);
    });

    it("recursively expands deeply nested unions", () => {
        const innerUnion = new RGXClassUnionToken(["c", "d"]);
        const result = expandRgxUnionTokens("a", ["b", innerUnion]);
        expect(result).toEqual(["a", "b", "c", "d"]);
    });
});

describe("removeRgxUnionDuplicates", () => {
    it("removes duplicate primitive tokens", () => {
        const result = removeRgxUnionDuplicates("a", "b", "a", "c", "b");
        expect(result).toEqual(["a", "b", "c"]);
    });

    it("removes duplicate RegExp tokens with same pattern and flags", () => {
        const result = removeRgxUnionDuplicates(/abc/, /def/, /abc/);
        expect(result).toEqual([/abc/, /def/]);
    });

    it("preserves RegExp tokens with different flags", () => {
        const result = removeRgxUnionDuplicates(/abc/i, /abc/g);
        expect(result.length).toBe(2);
    });

    it("returns an empty array when given no tokens", () => {
        const result = removeRgxUnionDuplicates();
        expect(result).toEqual([]);
    });
});