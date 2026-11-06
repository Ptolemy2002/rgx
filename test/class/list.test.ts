import {
    rgxa, rgxClassInit, RGXListToken, rgxList, rgxInterpolation, rgxTokenFromJSON, rgxPart, rgxPartAlias, registerRGXPartAlias,
    unregisterRGXPartAlias, listRGXPartAliases, rgxLookbehind, rgxGroup, rgxwa, RGXListParseFailedError, RGXNotSupportedError,
    RGXNotJSONSerializableError, RGXOutOfBoundsError, RGXInsertionRejectedError, RGXPartValidationFailedError, RGXRegexNotMatchedAtPositionError,
    RGXJSONClassArgsValidationFailedError, RGXInvalidTokenError, RGXError
} from "src/index";
import { ConstructFunction } from "src/internal";
import { expectError } from "../utils";

rgxClassInit();

const start = rgxInterpolation("^");
const end = rgxInterpolation("$");
const whole = (token: RGXListToken<any>, flags = "") => rgxa([start, token, end], flags);

function constructionTest(constructor: ConstructFunction<typeof RGXListToken>) {
    it("has one item alternative, at least one item and no maximum by default", () => {
        const list = constructor(/\d+/, ",");
        expect(list).toBeInstanceOf(RGXListToken);
        expect(list.items).toEqual([/\d+/]);
        expect(list.separator).toBe(",");
        expect(list.min).toBe(1);
        expect(list.max).toBeNull();
        expect(list.trailing).toBe(false);
        expect(list.atomicItems).toBe(true);
    });

    it("takes an array of item alternatives and options", () => {
        const list = constructor([/\d+/, /[a-z]+/], ",", { min: 2, max: 3, trailing: true, atomic: false });
        expect(list.items).toEqual([/\d+/, /[a-z]+/]);
        expect([list.min, list.max, list.trailing, list.atomicItems]).toEqual([2, 3, true, false]);
    });

    it("validates and floors its bounds", () => {
        expect(() => constructor("a", ",", { min: -1 })).toThrow(RGXOutOfBoundsError);
        expect(() => constructor("a", ",", { min: 3, max: 2 })).toThrow(RGXOutOfBoundsError);
        expect(() => constructor("a", ",", { max: -1 })).toThrow(RGXOutOfBoundsError);
        const list = constructor("a", ",", { min: 1.5, max: 2.5 });
        expect([list.min, list.max]).toEqual([1, 2]);
        list.max = null;
        expect(list.max).toBeNull();
    });
}

describe("RGXListToken", () => {
    afterEach(() => {
        for (const name of listRGXPartAliases()) unregisterRGXPartAlias(name);
    });

    describe("constructor", () => constructionTest((...args) => new RGXListToken(...args)));
    describe("construct function", () => constructionTest(rgxList));

    describe("type guards", () => {
        it("checks and asserts instances", () => {
            expect(RGXListToken.check(rgxList("a", ","))).toBe(true);
            expect(RGXListToken.check("a")).toBe(false);
            expect(() => RGXListToken.assert("a")).toThrow(RGXInvalidTokenError);
        });
    });

    describe("matching", () => {
        it("matches lists within its bounds", () => {
            const list = rgxList(/\d+/, ",", { min: 2, max: 3 });
            expect(whole(list).test("1")).toBe(false);
            expect(whole(list).test("1,22")).toBe(true);
            expect(whole(list).test("1,22,333")).toBe(true);
            expect(whole(list).test("1,22,333,4")).toBe(false);
            expect(whole(list).test("1,")).toBe(false);
        });

        it("matches any number of items by default, but at least one", () => {
            const list = rgxList(/\d+/, ",");
            expect(whole(list).test("")).toBe(false);
            expect(whole(list).test("1,2,3,4,5")).toBe(true);
        });

        it("matches the empty string with a minimum of 0", () => {
            const list = rgxList(/\d+/, ",", { min: 0, max: 2 });
            expect(whole(list).test("")).toBe(true);
            expect(whole(list).test("1,2")).toBe(true);
            expect(whole(list).test("1,2,3")).toBe(false);
        });

        it("matches nothing with a maximum of 0", () => {
            const list = rgxList(/\d+/, ",", { min: 0, max: 0 });
            expect(list.toRgx()).toBeNull();
            expect(whole(list).test("")).toBe(true);
            expect(whole(list).test("1")).toBe(false);
        });

        it("allows a trailing separator when asked", () => {
            expect(whole(rgxList(/\d+/, ",", { trailing: true })).test("1,2,")).toBe(true);
            expect(whole(rgxList(/\d+/, ",")).test("1,2,")).toBe(false);
        });

        it("matches any of its item alternatives, including parts", () => {
            const list = rgxList([rgxPart(/\d+/), /[a-z]+/], ",");
            expect(whole(list).test("1,ab,2")).toBe(true);
            expect(whole(list).test("1,AB")).toBe(false);
            expect(whole(list, "i").test("1,AB")).toBe(false);
        });

        it("matches items atomically by default, the way the walker does", () => {
            const items = [/a/, /ab/];
            expect(whole(rgxList(items, ",")).test("ab")).toBe(false);
            expect(whole(rgxList(items, ",", { atomic: false })).test("ab")).toBe(true);
        });

        it("matches items given as alias parts", () => {
            registerRGXPartAlias("number", rgxPart(/\d+/));
            expect(whole(rgxList(rgxPartAlias("number"), ",")).test("1,2")).toBe(true);
        });

        it("rejects dynamic parts", () => {
            expect(() => rgxList(rgxPart(() => "a"), ",").resolve()).toThrow(RGXNotSupportedError);
            expect(() => rgxList(rgxPart(() => "a"), ",").parse("a")).toThrow(RGXNotSupportedError);
        });

        it("can't be placed inside a lookbehind when it is atomic", () => {
            expect(() => rgxa([rgxLookbehind(rgxList("a", ",")), "b"])).toThrow(RGXInsertionRejectedError);
            expect(() => rgxa([rgxLookbehind(rgxList("a", ",", { atomic: false })), "b"])).not.toThrow();
        });
    });

    describe("parse", () => {
        it("returns a capture for each item, with positions in the text", () => {
            const list = rgxList<number>(rgxPart(/\d+/, { id: "n", transform: Number }), ",");
            const items = list.parse("1,22,333");
            expect(items.map(c => c.value)).toEqual([1, 22, 333]);
            expect(items.map(c => [c.start, c.end])).toEqual([[0, 1], [2, 4], [5, 8]]);
            expect(items.every(c => c.ownerId === "n")).toBe(true);
        });

        it("tells the item alternatives apart by branch, and keeps plain items as text", () => {
            const list = rgxList([rgxPart(/\d+/, { transform: Number }), /[a-z]+/], ",");
            const items = list.parse("1,ab");
            expect(items.map(c => [c.branch, c.value])).toEqual([[0, 1], [1, "ab"]]);
        });

        it("parses the text a list matched inside a part", () => {
            const list = rgxList<number>(rgxPart(/\d+/, { transform: Number }), ",");
            const walker = rgxwa<null>("[1,2,3]", ["[", rgxPart(list, { id: "list", transform: raw => list.parse(raw).map(c => c.value) }), "]"]);
            walker.walk();
            expect(walker.lastCapture("list")!.value).toEqual([1, 2, 3]);
        });

        it("uses alias parts", () => {
            registerRGXPartAlias("number", rgxPart(/\d+/, { transform: Number }));
            expect(rgxList(rgxPartAlias("number"), ",").parse("4,5").map(c => c.value)).toEqual([4, 5]);
        });

        it("handles empty text, trailing separators and bounds", () => {
            expect(rgxList("a", ",", { min: 0 }).parse("")).toEqual([]);
            expect(rgxList("a", ",", { max: 0, min: 0 }).parse("")).toEqual([]);
            expect(() => rgxList("a", ",", { max: 0, min: 0 }).parse("a")).toThrow(RGXListParseFailedError);
            expect(rgxList("a", ",", { trailing: true }).parse("a,a,").map(c => c.raw)).toEqual(["a", "a"]);
            expect(() => rgxList("a", ",").parse("a,a,")).toThrow(RGXRegexNotMatchedAtPositionError);
            expectError(() => rgxList("a", ",", { max: 2 }).parse("a,a,a"), RGXListParseFailedError, e => expect(e.position).toBe(3));
            expect(rgxList("a", ",", { max: 2, trailing: true }).parse("a,a,").map(c => c.raw)).toEqual(["a", "a"]);
            expectError(() => rgxList("a", ",", { max: 2, trailing: true }).parse("a,a,a"), RGXListParseFailedError, e => expect(e.position).toBe(4));
            expectError(() => rgxList("a", ",", { min: 3 }).parse("a,a"), RGXListParseFailedError, e => expect(e.message).toMatch(/fewer/));
            expect(() => rgxList("a", ",").parse("a;a")).toThrow(RGXRegexNotMatchedAtPositionError);
        });

        it("stops when items and separators match the empty string", () => {
            expect(() => rgxList(/x*/, /,?/).parse("y")).toThrow(RGXError);
        });

        it("stops when a part's hook stops the walker", () => {
            const list = rgxList(rgxPart("a", { afterCapture: (_, { walker }) => { walker.stop(); } }), ",");
            expect(() => list.parse("a,a")).toThrow(RGXListParseFailedError);
        });

        it("validates items with their parts", () => {
            const list = rgxList(rgxPart(/\d+/, { validate: c => c.raw !== "0" || "zero" }), ",");
            expect(() => list.parse("1,0")).toThrow(RGXPartValidationFailedError);
        });

        it("matches with the localizable flags given", () => {
            const validate = jest.fn(() => true);
            const list = rgxList([rgxPart("a", { id: "a", transform: raw => raw.toLowerCase(), validate }), "b"], rgxGroup({ capturing: false }, [";"]));
            expect(() => list.parse("A;B")).toThrow(RGXRegexNotMatchedAtPositionError);
            const items = list.parse("A;B", { flags: "ig" });
            expect(items.map(c => [c.ownerId, c.value])).toEqual([["a", "a"], [null, "B"]]);
            expect(validate).toHaveBeenCalledTimes(1);
            expect(() => rgxList(rgxPart("a", { validate: () => "no" }), ",").parse("A", { flags: "i" })).toThrow(RGXPartValidationFailedError);
        });
    });

    describe("clone", () => {
        it("returns itself at depth 0", () => {
            const list = rgxList("a", ",");
            expect(list.clone(0)).toBe(list);
        });

        it("copies its items, separator and options", () => {
            const part = rgxPart(/\d/);
            const list = rgxList([part, /x/], ",", { min: 0, max: 4, trailing: true, atomic: false });
            const clone = list.clone();
            expect(clone.items[0]).not.toBe(part);
            expect(clone.items[0]).toBeInstanceOf(Object);
            expect([clone.min, clone.max, clone.trailing, clone.atomicItems]).toEqual([0, 4, true, false]);
            expect(clone.resolve()).toBe(list.resolve());
        });
    });

    describe("JSON", () => {
        it("round trips, storing parts by their alias", () => {
            registerRGXPartAlias("number", rgxPart(/\d+/, { transform: Number }));
            const list = rgxList([rgxPartAlias("number"), /[a-z]+/], ",", { min: 2 });
            const json = list.toJSON();
            expect(json).toEqual({
                $rgx: true, class: "RGXListToken",
                args: [[{ alias: "number" }, { $rgx: true, source: "[a-z]+" }], ",", { min: 2, max: null, trailing: false, atomic: true }]
            });
            const result = rgxTokenFromJSON(JSON.parse(JSON.stringify(json))) as RGXListToken;
            expect(result).toBeInstanceOf(RGXListToken);
            expect(result.parse("1,ab").map(c => c.value)).toEqual([1, "ab"]);
        });

        it("can't store parts that aren't alias parts", () => {
            expect(() => rgxList(rgxPart("a"), ",").toJSON()).toThrow(RGXNotJSONSerializableError);
        });

        it("defaults its options and validates its args", () => {
            expect(RGXListToken.fromJSON({ $rgx: true, class: "RGXListToken", args: [["a"], ","] }).min).toBe(1);
            const reject = (args: unknown[]) => () => RGXListToken.fromJSON({ $rgx: true, class: "RGXListToken", args: args as never });
            expect(reject(["a"])).toThrow(RGXJSONClassArgsValidationFailedError);
            expect(reject(["a", ","])).toThrow(/items/);
            expect(reject([[{ alias: 1 }], ","])).toThrow(/items/);
            expect(reject([["a"], { nope: 1 }])).toThrow(/separator/);
            expect(reject([["a"], ",", 5])).toThrow(/options/);
            expect(reject([["a"], ",", { min: "1" }])).toThrow(/min/);
            expect(reject([["a"], ",", { max: "1" }])).toThrow(/max/);
            expect(reject([["a"], ",", { trailing: 1 }])).toThrow(/trailing/);
            expect(reject([["a"], ",", { atomic: 1 }])).toThrow(/atomic/);
        });
    });
});
