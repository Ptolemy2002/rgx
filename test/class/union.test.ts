import { RGXClassUnionToken, rgxClassInit, rgxClassUnion } from "src/class";
import { RGXTokenCollection } from "src/collection";
import { ConstructFunction } from "src/internal";

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
    describe("constructor", () => {
        constructionTest((...args) => new RGXClassUnionToken(...args));
    });

    describe("construct function", () => {
        constructionTest(rgxClassUnion);
    });

    describe("isGroup", () => {
        it("is true", () => {
            const instance = new RGXClassUnionToken();
            expect(instance.isGroup).toBe(true);
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