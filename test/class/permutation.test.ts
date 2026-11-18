import {
    rgxa, rgxClassInit, RGXPermutationToken, rgxPermutation, rgxInterpolation, rgxTokenFromJSON, rgxPart, rgxPartAlias,
    registerRGXPartAlias, unregisterRGXPartAlias, listRGXPartAliases, rgxwa, RGXPermutationParseFailedError, RGXNotSupportedError,
    RGXNotJSONSerializableError, RGXOutOfBoundsError, RGXPartValidationFailedError, RGXRegexNotMatchedAtPositionError,
    RGXJSONClassArgsValidationFailedError, RGXInvalidTokenError, isRGXPermutationItemConfig, RGXError
} from "src/index";
import { ConstructFunction } from "src/internal";
import { expectError } from "../utils";

rgxClassInit();

const start = rgxInterpolation("^");
const end = rgxInterpolation("$");
const whole = (token: RGXPermutationToken<any>, flags = "") => rgxa([start, token, end], flags);

function constructionTest(constructor: ConstructFunction<typeof RGXPermutationToken>) {
    it("takes every item once by default", () => {
        const permutation = constructor(["a", /b/]);
        expect(permutation).toBeInstanceOf(RGXPermutationToken);
        expect(permutation.items).toEqual([{ item: "a", min: 0, max: 1 }, { item: /b/, min: 0, max: 1 }]);
        expect([permutation.min, permutation.max]).toEqual([null, null]);
        expect([permutation.minLength(), permutation.maxLength()]).toEqual([2, 2]);
        expect(permutation.separator).toBeUndefined();
        expect(permutation.atomicItems).toBe(true);
    });

    it("takes items with their own bounds and options", () => {
        const permutation = constructor([{ item: "a", min: 1, max: 2.5 }, { item: "b", max: null }, "c"], { min: 1, max: 4, separator: ",", atomic: false });
        expect(permutation.items).toEqual([{ item: "a", min: 1, max: 2 }, { item: "b", min: 0, max: null }, { item: "c", min: 0, max: 1 }]);
        expect([permutation.min, permutation.max, permutation.separator, permutation.atomicItems]).toEqual([1, 4, ",", false]);
    });

    it("validates and floors its bounds", () => {
        expect(() => constructor(["a"], { min: -1 })).toThrow(RGXOutOfBoundsError);
        expect(() => constructor(["a", "b"], { min: 3 })).toThrow(RGXOutOfBoundsError);
        expect(() => constructor(["a", "b"], { min: 2, max: 1 })).toThrow(RGXOutOfBoundsError);
        expect(() => constructor(["a"], { max: -1 })).toThrow(RGXOutOfBoundsError);
        expect(() => constructor([{ item: "a", min: -1 }])).toThrow(RGXOutOfBoundsError);
        expect(() => constructor([{ item: "a", min: 2 }])).toThrow(RGXOutOfBoundsError);
        const permutation = constructor(["a", "b", "c"], { min: 1.5, max: 2.5 });
        expect([permutation.min, permutation.max]).toEqual([1, 2]);
        permutation.min = null;
        permutation.max = null;
        expect([permutation.minLength(), permutation.maxLength()]).toEqual([3, 3]);
    });
}

describe("RGXPermutationToken", () => {
    afterEach(() => {
        for (const name of listRGXPartAliases()) unregisterRGXPartAlias(name);
    });

    describe("constructor", () => constructionTest((...args) => new RGXPermutationToken(...args)));
    describe("construct function", () => constructionTest(rgxPermutation));

    describe("type guards", () => {
        it("checks and asserts instances", () => {
            expect(RGXPermutationToken.check(rgxPermutation(["a"]))).toBe(true);
            expect(RGXPermutationToken.check("a")).toBe(false);
            expect(() => RGXPermutationToken.assert("a")).toThrow(RGXInvalidTokenError);
        });

        it("tells item configs apart from tokens", () => {
            expect(isRGXPermutationItemConfig({ item: "a" })).toBe(true);
            expect(isRGXPermutationItemConfig("a")).toBe(false);
            expect(isRGXPermutationItemConfig(/a/)).toBe(false);
            expect(isRGXPermutationItemConfig(["a"])).toBe(false);
            expect(isRGXPermutationItemConfig(rgxPart("a"))).toBe(false);
            expect(isRGXPermutationItemConfig({ item: "a", toRgx: () => "a" } as never)).toBe(false);
        });
    });

    describe("lengths", () => {
        it("defaults the total to the number of items, capped by the items' maximums", () => {
            expect(rgxPermutation(["a", { item: "b", max: 0 }]).minLength()).toBe(1);
            expect(rgxPermutation(["a", { item: "b", max: 3 }]).maxLength()).toBe(4);
            expect(rgxPermutation(["a", { item: "b", max: null }])).toMatchObject({});
            expect(rgxPermutation(["a", { item: "b", max: null }]).maxLength()).toBeNull();
            expect(rgxPermutation(["a", "b", "c"], { max: 2 }).minLength()).toBe(2);
        });
    });

    describe("matching", () => {
        it("matches every order of its items, without repeats in the pattern itself", () => {
            const permutation = rgxPermutation(["a", "b", "c"]);
            for (const text of ["abc", "acb", "bac", "bca", "cab", "cba", "aab"]) expect(whole(permutation).test(text)).toBe(true);
            expect(whole(permutation).test("ab")).toBe(false);
            expect(whole(permutation).test("abca")).toBe(false);
        });

        it("matches runs within the total bounds", () => {
            const permutation = rgxPermutation(["a", "b", "c"], { min: 1, max: 2 });
            expect(whole(permutation).test("")).toBe(false);
            expect(whole(permutation).test("c")).toBe(true);
            expect(whole(permutation).test("ca")).toBe(true);
            expect(whole(permutation).test("cab")).toBe(false);
            expect(whole(rgxPermutation(["a"], { min: 0 })).test("")).toBe(true);
        });

        it("matches separators between items", () => {
            const permutation = rgxPermutation(["a", "b", "c"], { separator: ",", min: 2 });
            expect(whole(permutation).test("c,a")).toBe(true);
            expect(whole(permutation).test("c,a,b")).toBe(true);
            expect(whole(permutation).test("ca")).toBe(false);
            expect(whole(permutation).test("c")).toBe(false);
            expect(whole(permutation).test("c,a,b,a")).toBe(false);
            const unlimited = rgxPermutation([{ item: "a", max: null }], { separator: "," });
            expect(whole(unlimited).test("a,a,a,a")).toBe(true);
            const optional = rgxPermutation(["a", "b"], { separator: ",", min: 0, atomic: false });
            expect(whole(optional).test("")).toBe(true);
            expect(whole(optional).test("b,a")).toBe(true);
        });

        it("matches nothing when there can be no items", () => {
            expect(rgxPermutation([]).toRgx()).toBeNull();
            expect(rgxPermutation(["a"], { max: 0, min: 0 }).toRgx()).toBeNull();
        });

        it("matches items atomically by default, the way the walker does", () => {
            expect(whole(rgxPermutation(["a", "ab"], { min: 1 })).test("ab")).toBe(false);
            expect(whole(rgxPermutation(["a", "ab"], { min: 1, atomic: false })).test("ab")).toBe(true);
            expect(whole(rgxPermutation(["ab", "a"], { min: 1 })).test("ab")).toBe(true);
        });

        it("allows named groups in items without a separator", () => {
            const permutation = rgxPermutation([/(?<x>a)/, "b"]);
            expect(whole(permutation).exec("ba")!.groups!.x).toBe("a");
        });

        it("rejects dynamic parts", () => {
            expect(() => rgxPermutation([rgxPart(() => "a")]).resolve()).toThrow(RGXNotSupportedError);
            expect(() => rgxPermutation([rgxPart(() => "a")]).parse("a")).toThrow(RGXNotSupportedError);
        });
    });

    describe("parse", () => {
        it("returns a capture for each item, with the item's index as its branch", () => {
            const permutation = rgxPermutation<number | string>([rgxPart(/\d+/, { id: "n", transform: Number }), /[a-z]+/], { separator: " " });
            const items = permutation.parse("ab 12");
            expect(items.map(c => [c.branch, c.value, c.start, c.end])).toEqual([[1, "ab", 0, 2], [0, 12, 3, 5]]);
        });

        it("counts a single item whatever branch of its own it matched", () => {
            expect(rgxPermutation([{ item: ["a", "b"], max: 2 }]).parse("ba").map(c => c.raw)).toEqual(["b", "a"]);
            expect(() => rgxPermutation([{ item: ["a", "b"], max: 2 }]).parse("bab")).toThrow(RGXPermutationParseFailedError);
        });

        it("fails as soon as an item appears too many times", () => {
            const validate = jest.fn(() => true as const);
            const permutation = rgxPermutation(["a", rgxPart("b", { validate })]);
            expectError(() => permutation.parse("aab"), RGXPermutationParseFailedError, e => {
                expect(e.message).toMatch(/Item 0 appears more than its maximum of 1/);
                expect(e.position).toBe(1);
            });
            expect(validate).not.toHaveBeenCalled();
        });

        it("fails as soon as there are too many items", () => {
            const permutation = rgxPermutation([{ item: "a", max: null }], { max: 2, separator: "," });
            expectError(() => permutation.parse("a,a,a"), RGXPermutationParseFailedError, e => {
                expect(e.message).toMatch(/more than the maximum of 2/);
                expect(e.position).toBe(4);
            });
        });

        it("checks the total and each item's minimum at the end", () => {
            const permutation = rgxPermutation([{ item: "a", min: 1 }, "b", "c"], { min: 2 });
            expect(permutation.parse("ba").map(c => c.raw)).toEqual(["b", "a"]);
            expectError(() => permutation.parse("b"), RGXPermutationParseFailedError, e => expect(e.message).toMatch(/1 items, fewer than the minimum of 2/));
            expectError(() => permutation.parse("bc"), RGXPermutationParseFailedError, e => {
                expect(e.message).toMatch(/Item 0 appears 0 times, fewer than its minimum of 1/);
                expect(e.code).toBe("PERMUTATION_PARSE_FAILED");
            });
        });

        it("handles empty text and empty permutations", () => {
            expect(rgxPermutation(["a"], { min: 0 }).parse("")).toEqual([]);
            expect(rgxPermutation([]).parse("")).toEqual([]);
            expect(() => rgxPermutation(["a"]).parse("")).toThrow(/0 items, fewer than the minimum of 1/);
            expect(() => rgxPermutation([{ item: "a", min: 1 }], { min: 0 }).parse("")).toThrow(/Item 0/);
            expect(() => rgxPermutation([]).parse("a")).toThrow(RGXPermutationParseFailedError);
            expect(() => rgxPermutation(["a"], { max: 0, min: 0 }).parse("a")).toThrow(RGXPermutationParseFailedError);
        });

        it("throws the walker's errors for text that isn't an item or separator", () => {
            expect(() => rgxPermutation(["a", "b"]).parse("ax")).toThrow(RGXRegexNotMatchedAtPositionError);
            expect(() => rgxPermutation(["a", "b"], { separator: "," }).parse("a;b")).toThrow(RGXRegexNotMatchedAtPositionError);
        });

        it("stops when items and separators match the empty string, or a hook stops the walker", () => {
            expect(() => rgxPermutation([/x*/], { separator: /,?/, min: 0 }).parse("y")).toThrow(RGXError);
            const stopping = rgxPermutation([rgxPart("a", { afterCapture: (_, { walker }) => { walker.stop(); } }), "b"]);
            expect(() => stopping.parse("ab")).toThrow(/doesn't match all of the text/);
        });

        it("doesn't count items a hook keeps from being recorded", () => {
            const permutation = rgxPermutation([rgxPart("a", { beforeCapture: () => "silent" }), "b"], { min: 1 });
            expect(permutation.parse("ab").map(c => c.raw)).toEqual(["b"]);
        });

        it("validates items with their parts, and matches with the given flags", () => {
            const permutation = rgxPermutation([{ item: rgxPart(/[a-z]/, { validate: c => c.raw !== "x" || "no x" }), max: 2 }]);
            expect(() => permutation.parse("ax")).toThrow(RGXPartValidationFailedError);
            expect(() => rgxPermutation(["a", "b"]).parse("BA")).toThrow(RGXRegexNotMatchedAtPositionError);
            expect(rgxPermutation(["a", "b"]).parse("BA", { flags: "ig" }).map(c => c.raw)).toEqual(["B", "A"]);
            // In a union, an item that fails validation is dropped so the others get a chance, the way the walker does.
            expect(() => rgxPermutation([rgxPart(/[a-z]/, { validate: c => c.raw !== "x" || "no x" }), "1"]).parse("x1")).toThrow(RGXRegexNotMatchedAtPositionError);
        });

        it("enforces the counts from a part's transform", () => {
            const modifiers = rgxPermutation(["public", "static", "final"], { separator: " ", min: 1 });
            const part = rgxPart(modifiers, { id: "modifiers", transform: raw => modifiers.parse(raw).map(item => item.raw) });
            const walker = rgxwa("static final", [part]);
            walker.walk();
            expect(walker.lastCapture("modifiers")!.value).toEqual(["static", "final"]);
            expect(() => rgxwa("static static", [part]).walk()).toThrow(RGXPermutationParseFailedError);
        });
    });

    describe("clone", () => {
        it("returns itself at depth 0", () => {
            const permutation = rgxPermutation(["a"]);
            expect(permutation.clone(0)).toBe(permutation);
        });

        it("copies its items, separator and options", () => {
            const part = rgxPart(/\d/);
            const permutation = rgxPermutation([part, { item: /x/, min: 1, max: 3 }], { min: 1, max: 3, separator: ",", atomic: false });
            const clone = permutation.clone();
            expect(clone.items[0]!.item).not.toBe(part);
            expect(clone.items[1]).toEqual({ item: /x/, min: 1, max: 3 });
            expect([clone.min, clone.max, clone.separator, clone.atomicItems]).toEqual([1, 3, ",", false]);
            expect(clone.resolve()).toBe(permutation.resolve());
            expect(rgxPermutation(["a"]).clone().separator).toBeUndefined();
        });
    });

    describe("JSON", () => {
        it("round trips, storing parts by their alias and items with their bounds when they aren't the default", () => {
            registerRGXPartAlias("number", rgxPart(/\d+/, { transform: Number }));
            const permutation = rgxPermutation([rgxPartAlias("number"), { item: /[a-z]+/, min: 1, max: null }], { separator: "," });
            const json = permutation.toJSON();
            expect(json).toEqual({
                $rgx: true, class: "RGXPermutationToken",
                args: [[{ alias: "number" }, { item: { $rgx: true, source: "[a-z]+" }, min: 1, max: null }], { min: null, max: null, atomic: true, separator: "," }]
            });
            const result = rgxTokenFromJSON(JSON.parse(JSON.stringify(json))) as RGXPermutationToken;
            expect(result).toBeInstanceOf(RGXPermutationToken);
            expect(result.parse("ab,1,cd").map(c => c.value)).toEqual(["ab", 1, "cd"]);
            expect(rgxPermutation([{ item: { alias: "number" } as never }]).items[0]!.item).toEqual({ alias: "number" });
            expect((rgxPermutation(["a"]).toJSON().args![1] as object)).not.toHaveProperty("separator");
            expect((RGXPermutationToken.fromJSON({ $rgx: true, class: "RGXPermutationToken", args: [[{ item: { alias: "number" } }]] }).items[0]!.item as { alias: string }).alias).toBe("number");
        });

        it("can't store parts that aren't alias parts", () => {
            expect(() => rgxPermutation([rgxPart("a")]).toJSON()).toThrow(RGXNotJSONSerializableError);
        });

        it("defaults its options and validates its args", () => {
            expect(RGXPermutationToken.fromJSON({ $rgx: true, class: "RGXPermutationToken", args: [["a", "b"]] }).minLength()).toBe(2);
            expect(RGXPermutationToken.fromJSON({ $rgx: true, class: "RGXPermutationToken", args: [["a", "b"], { min: 1 }] }).hasSeparator()).toBe(false);
            const reject = (args: unknown[]) => () => RGXPermutationToken.fromJSON({ $rgx: true, class: "RGXPermutationToken", args: args as never });
            expect(reject([])).toThrow(RGXJSONClassArgsValidationFailedError);
            expect(reject(["a"])).toThrow(/items/);
            expect(reject([[{ alias: 1 }]])).toThrow(/items/);
            expect(reject([[{ item: "a", min: "1" }]])).toThrow(/items/);
            expect(reject([[{ item: "a", max: "1" }]])).toThrow(/items/);
            expect(reject([[{ item: "a", other: 1 }]])).toThrow(/items/);
            expect(reject([[{ item: { nope: 1 } }]])).toThrow(/items/);
            expect(reject([["a"], 5])).toThrow(/options/);
            expect(reject([["a"], { min: "1" }])).toThrow(/min/);
            expect(reject([["a"], { max: "1" }])).toThrow(/max/);
            expect(reject([["a"], { separator: { nope: 1 } }])).toThrow(/separator/);
            expect(reject([["a"], { atomic: 1 }])).toThrow(/atomic/);
        });
    });
});
