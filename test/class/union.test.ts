import { RGXClassUnionToken, rgxClassInit, rgxClassUnion, expandRgxUnionTokens, removeRgxUnionDuplicates, RGXClassToken } from "src/class";
import { RGXTokenCollection } from "src/collection";
import { RGXInvalidTokenError } from "src/errors";
import { ConstructFunction } from "src/internal";

class TestClassToken extends RGXClassToken {
    toRgx() {
        return "test";
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
        expect(instance.tokens.toArray()).toEqual([]);
    });

    it("correctly initializes with an empty array", () => {
        const instance = constructor([]);
        expect(instance.tokens.toArray()).toEqual([]);
    });

    it("correctly initializes with an array of tokens", () => {
        const tokens = ["a", "b", "c"];
        const instance = constructor(tokens);
        expect(instance.tokens.toArray()).toEqual(tokens);
    });

    it("expands an RGXTokenCollection in union mode", () => {
        const tokens = ["a", "b", "c"];
        const tokenCollection = new RGXTokenCollection(tokens, 'union');
        const instance = constructor(tokenCollection);
        expect(instance.tokens.toArray()).toEqual(tokens);
    });

    it("does not expand a RGXTokenCollection in concat mode", () => {
        const tokens = ["a", "b", "c"];
        const tokenCollection = new RGXTokenCollection(tokens, 'concat');
        const instance = constructor(tokenCollection);
        expect(instance.tokens.tokens).toEqual([tokenCollection]);
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

    describe("isGroup", () => {
        it("is false", () => {
            const instance = new RGXClassUnionToken();
            expect(instance.isGroup).toBe(false);
        });
    });

    it("resolves correctly", () => {
        const instance = new RGXClassUnionToken(["a", "b"]);
        expect(instance.resolve()).toBe("(?:a|b)");
    });

    describe("add", () => {
        it("adds a token to the union", () => {
            const instance = new RGXClassUnionToken(["a"]);
            instance.add("b");
            expect(instance.tokens.toArray()).toEqual(["a", "b"]);
        });

        it("adds a token to the beginning of the union when pos is 'prefix'", () => {
            const instance = new RGXClassUnionToken(["a"]);
            instance.add("b", 'prefix');
            expect(instance.tokens.toArray()).toEqual(["b", "a"]);
        });

        it("adds multiple tokens to the union", () => {
            const instance = new RGXClassUnionToken(["a"]);
            instance.add(["b", "c"]);
            expect(instance.tokens.toArray()).toEqual(["a", "b", "c"]);
        });

        it("adds multiple tokens to the union when pos is 'prefix'", () => {
            const instance = new RGXClassUnionToken(["a"]);
            instance.add("b", 'prefix');
            instance.add("c", 'prefix');
            expect(instance.tokens.toArray()).toEqual(["c", "b", "a"]);
        });

        it("expands a collection in union mode", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherCollection = new RGXTokenCollection(["b", "c"], 'union');
            instance.add(otherCollection);
            expect(instance.tokens.toArray()).toEqual(["a", "b", "c"]);
        });

        it("does not expand a collection in concat mode", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherCollection = new RGXTokenCollection(["b", "c"], 'concat');
            instance.add(otherCollection);
            expect(instance.tokens.toArray()).toEqual(["a", otherCollection]);
        });

        it("flattens nested unions when adding", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherUnion = new RGXClassUnionToken(["b", "c"]);
            instance.add(otherUnion);
            expect(instance.tokens.toArray()).toEqual(["a", "b", "c"]);
        });

        it("removes direct repeats when adding", () => {
            const instance = new RGXClassUnionToken(["a"]);
            instance.add("a");
            expect(instance.tokens.toArray()).toEqual(["a"]);
        });

        it("removes nested repeats when adding", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherUnion = new RGXClassUnionToken(["a", "b"]);
            instance.add(otherUnion);
            expect(instance.tokens.toArray()).toEqual(["a", "b"]);
        });

        it("mutates the original instance", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const result = instance.add("b");
            expect(result).toBe(instance);
            expect(instance.tokens.toArray()).toEqual(["a", "b"]);
        });
    });

    describe("concat", () => {
        it("concatenates another union to the end", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherUnion = new RGXClassUnionToken(["b", "c"]);
            instance.concat('suffix', otherUnion);
            expect(instance.tokens.toArray()).toEqual(["a", "b", "c"]);
        });

        it("concatenates another union to the beginning", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherUnion = new RGXClassUnionToken(["b", "c"]);
            instance.concat('prefix', otherUnion);
            expect(instance.tokens.toArray()).toEqual(["b", "c", "a"]);
        });

        it("expands collections in union mode when concatenating", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherCollection = new RGXTokenCollection(["b", "c"], 'union');
            instance.concat('suffix', otherCollection);
            expect(instance.tokens.toArray()).toEqual(["a", "b", "c"]);
        });

        it("does not expand collections in concat mode when concatenating", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherCollection = new RGXTokenCollection(["b", "c"], 'concat');
            instance.concat('suffix', otherCollection);
            expect(instance.tokens.tokens).toEqual(["a", otherCollection]);
        });

        it("removes direct repeats when concatenating", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherUnion = new RGXClassUnionToken(["a", "b"]);
            instance.concat('suffix', otherUnion);
            expect(instance.tokens.toArray()).toEqual(["a", "b"]);
        });

        it("removes nested repeats when concatenating", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherUnion1 = new RGXClassUnionToken(["a", "b"]);
            const otherUnion2 = new RGXClassUnionToken(["b", "c"]);
            instance.concat('suffix', otherUnion1, otherUnion2);
            expect(instance.tokens.toArray()).toEqual(["a", "b", "c"]);
        });

        it("mutates the original instance", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherUnion = new RGXClassUnionToken(["b", "c"]);
            const result = instance.concat('suffix', otherUnion);
            expect(result).toBe(instance);
            expect(instance.tokens.toArray()).toEqual(["a", "b", "c"]);
        });

        it("defaults to suffix concatenation", () => {
            const instance = new RGXClassUnionToken(["a"]);
            const otherUnion = new RGXClassUnionToken(["b", "c"]);
            instance.concat(undefined, otherUnion);
            expect(instance.tokens.toArray()).toEqual(["a", "b", "c"]);
        });
    });

    describe("cleanTokens", () => {
        it("removes direct repeats", () => {
            const instance = new RGXClassUnionToken();
            // Directly modify tokens, since a clean call happens on creation.
            instance.tokens.push("a", "b", "a");
            instance.cleanTokens();
            expect(instance.tokens.toArray()).toEqual(["a", "b"]);
        });

        it("removes nested repeats", () => {
            const instance = new RGXClassUnionToken();
            // Directly modify tokens, since a clean call happens on creation.
            instance.tokens.push("a", new RGXClassUnionToken(["a", "b"]));
            instance.cleanTokens();
            expect(instance.tokens.toArray()).toEqual(["a", "b"]);
        });

        it("expands nested collections in union mode", () => {
            const instance = new RGXClassUnionToken();
            const otherCollection = new RGXTokenCollection(["a", "b"], 'union');
            // Directly modify tokens, since a clean call happens on creation.
            instance.tokens.push(otherCollection);
            instance.cleanTokens();
            expect(instance.tokens.toArray()).toEqual(["a", "b"]);
        });

        it("does not expand nested collections in concat mode", () => {
            const instance = new RGXClassUnionToken();
            const otherCollection = new RGXTokenCollection(["a", "b"], 'concat');
            // Directly modify tokens, since a clean call happens on creation.
            instance.tokens.push(otherCollection);
            instance.cleanTokens();
            expect(instance.tokens.tokens).toEqual([otherCollection]);
        });

        it("mutates the original instance", () => {
            const instance = new RGXClassUnionToken();
            // Directly modify tokens, since a clean call happens on creation.
            instance.tokens.push("a", "b", "a");
            const result = instance.cleanTokens();
            expect(result).toBe(instance);
            expect(instance.tokens.toArray()).toEqual(["a", "b"]);
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
            expect((result as RGXClassUnionToken).tokens.toArray()).toEqual(["a", "b", "c"]);
        });
    });
});

describe("expandRgxUnionTokens", () => {
    it("returns a flat collection from plain tokens", () => {
        const result = expandRgxUnionTokens("a", "b", "c");
        expect(result.toArray()).toEqual(["a", "b", "c"]);
    });

    it("expands nested arrays", () => {
        const result = expandRgxUnionTokens("a", ["b", "c"]);
        expect(result.toArray()).toEqual(["a", "b", "c"]);
    });

    it("expands RGXTokenCollection in union mode", () => {
        const collection = new RGXTokenCollection(["b", "c"], "union");
        const result = expandRgxUnionTokens("a", collection);
        expect(result.toArray()).toEqual(["a", "b", "c"]);
    });

    it("does not expand RGXTokenCollection in concat mode", () => {
        const collection = new RGXTokenCollection(["b", "c"], "concat");
        const result = expandRgxUnionTokens("a", collection);
        expect(result.toArray()).toEqual(["a", collection]);
    });

    it("expands RGXClassUnionToken instances", () => {
        const union = new RGXClassUnionToken(["b", "c"]);
        const result = expandRgxUnionTokens("a", union);
        expect(result.toArray()).toEqual(["a", "b", "c"]);
    });

    it("recursively expands deeply nested unions", () => {
        const innerUnion = new RGXClassUnionToken(["c", "d"]);
        const outerCollection = new RGXTokenCollection(["b", innerUnion], "union");
        const result = expandRgxUnionTokens("a", outerCollection);
        expect(result.toArray()).toEqual(["a", "b", "c", "d"]);
    });
});

describe("removeRgxUnionDuplicates", () => {
    it("removes duplicate primitive tokens", () => {
        const result = removeRgxUnionDuplicates("a", "b", "a", "c", "b");
        expect(result.toArray()).toEqual(["a", "b", "c"]);
    });

    it("returns a collection in union mode", () => {
        const result = removeRgxUnionDuplicates("a", "b");
        expect(result.mode).toBe("union");
    });

    it("removes duplicate RegExp tokens with same pattern and flags", () => {
        const result = removeRgxUnionDuplicates(/abc/, /def/, /abc/);
        expect(result.toArray()).toEqual([/abc/, /def/]);
    });

    it("preserves RegExp tokens with different flags", () => {
        const result = removeRgxUnionDuplicates(/abc/i, /abc/g);
        expect(result.length).toBe(2);
    });

    it("returns an empty collection when given no tokens", () => {
        const result = removeRgxUnionDuplicates();
        expect(result.toArray()).toEqual([]);
    });
});