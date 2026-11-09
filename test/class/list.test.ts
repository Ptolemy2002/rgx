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

    describe("preposition and padSeparator", () => {
        const words = (options = {}) => rgxList(rgxPart(/\w+/), ",", { padSeparator: true, preposition: "and", ...options });

        it("stores the options, with no preposition and no padding by default", () => {
            const list = rgxList("a", ",");
            expect(list.preposition).toBeUndefined();
            expect(list.hasPreposition()).toBe(false);
            expect(list.padSeparator).toBe(false);
            expect(list.separatorToken()).toBe(",");
            expect(list.prepositionToken()).toBeUndefined();
            expect(rgxList("a", ",", { preposition: "and" }).prepositionToken()).toBe("and");
        });

        it("allows optional whitespace around separators", () => {
            const list = rgxList(/\d+/, ",", { padSeparator: true });
            expect(whole(list).test("1 ,2,  3")).toBe(true);
            expect(list.parse("1 ,2,  3").map(c => c.raw)).toEqual(["1", "2", "3"]);
            expect(whole(rgxList(/\d+/, ",")).test("1, 2")).toBe(false);
        });

        it("requires the preposition before the last of two or more items", () => {
            const list = words();
            expect(whole(list).test("a")).toBe(true);
            expect(whole(list).test("a, and b")).toBe(true);
            expect(whole(list).test("a, b, and c")).toBe(true);
            expect(whole(list).test("a, b, c")).toBe(false);
            expect(whole(list).test("a, and b, c")).toBe(false);
            expect(whole(words({ optionalPreposition: true, max: 3 })).test("a, b, c")).toBe(true);
            expect(whole(words({ optionalPreposition: true, max: 3 })).test("a, b, c, d")).toBe(false);

            expect(list.parse("a").map(c => c.raw)).toEqual(["a"]);
            expect(list.parse("a, and b").map(c => c.raw)).toEqual(["a", "b"]);
            expect(list.parse("a, b, and c").map(c => c.raw)).toEqual(["a", "b", "c"]);
            expect(() => list.parse("a, b, c")).toThrow(RGXListParseFailedError);
            expect(() => list.parse("a, and b, c")).toThrow(RGXRegexNotMatchedAtPositionError);
        });

        it("treats an item that looks like the preposition as an item unless it ends the list", () => {
            const list = words();
            expect(whole(list).test("a, and, and b")).toBe(true);
            expect(list.parse("a, and, and b").map(c => c.raw)).toEqual(["a", "and", "b"]);
        });

        it("respects the bounds", () => {
            const list = words({ min: 2, max: 3 });
            expect(whole(list).test("a")).toBe(false);
            expect(whole(list).test("a, b, and c")).toBe(true);
            expect(whole(list).test("a, b, c, and d")).toBe(false);
            expect(() => list.parse("a")).toThrow(RGXListParseFailedError);
            expect(() => list.parse("a, b, c, and d")).toThrow(RGXListParseFailedError);
            expect(whole(words({ min: 0 })).test("")).toBe(true);
            expect(whole(words({ max: 1 })).test("a")).toBe(true);
            expect(whole(words({ max: 1 })).test("a, and b")).toBe(false);
        });

        it("works with trailing separators", () => {
            const list = words({ trailing: true });
            expect(whole(list).test("a, b, and c,")).toBe(true);
            expect(list.parse("a, b, and c ,").map(c => c.raw)).toEqual(["a", "b", "c"]);
            expect(() => list.parse("a, b,")).toThrow(RGXListParseFailedError);
            expect(words({ trailing: true, max: 2 }).parse("a, and b,").map(c => c.raw)).toEqual(["a", "b"]);
        });

        it("falls back when the item after the preposition fails validation", () => {
            const list = rgxList(rgxPart(/\w+/, { validate: c => c.raw !== "x" }), ",", { padSeparator: true, preposition: "and" });
            // "and" is then read as an ordinary item, which a separator has to follow.
            expect(() => list.parse("a, and x")).toThrow(RGXRegexNotMatchedAtPositionError);
        });

        it("rethrows other errors from the item after the preposition", () => {
            const list = rgxList(rgxPart(/\w+/, { afterCapture: c => { if (c.raw === "b") throw new Error("boom"); } }), ",", { preposition: "and " });
            expect(() => list.parse("a,and b")).toThrow("boom");
        });

        it("matches without atomic items too", () => {
            expect(whole(words({ atomic: false })).test("a, b, and c")).toBe(true);
        });

        it("join a pair of items with the preposition alone when pairSeparator is false", () => {
            const list = words({ pairSeparator: false });
            expect(list.pairJoinToken()).toBeInstanceOf(Object);
            expect(rgxList("a", ",", { preposition: " and ", pairSeparator: false }).pairJoinToken()).toBe(" and ");
            expect(rgxList("a", ",", { pairSeparator: false }).pairJoinToken()).toBeUndefined();
            // Without a preposition, two items still need a separator.
            const noPreposition = rgxList(/\w+/, ",", { pairSeparator: false });
            expect(rgxa([rgxInterpolation("^"), noPreposition, rgxInterpolation("$")]).test("a,b")).toBe(true);
            expect(rgxa([rgxInterpolation("^"), noPreposition, rgxInterpolation("$")]).test("a b")).toBe(false);
            expect(noPreposition.parse("a,b").map(c => c.raw)).toEqual(["a", "b"]);
            expect(words().pairJoinToken()).toBeUndefined();

            for (const [text, valid] of [["a", true], ["a and b", true], ["a, and b", false], ["a, b", false], ["a, b, and c", true], ["a and b, c", false]] as const) {
                expect([text, whole(list).test(text)]).toEqual([text, valid]);
                if (valid) expect(list.parse(text).length).toBeGreaterThan(0);
                else expect(() => list.parse(text)).toThrow(RGXError);
            }
            expect(list.parse("a and b").map(c => c.raw)).toEqual(["a", "b"]);
            expect(words({ pairSeparator: false, trailing: true }).parse("a and b,").map(c => c.raw)).toEqual(["a", "b"]);
        });

        it("respect the bounds when pairs are joined by the preposition", () => {
            const pairsOnly = words({ pairSeparator: false, min: 2, max: 2 });
            expect(whole(pairsOnly).test("a and b")).toBe(true);
            expect(whole(pairsOnly).test("a, b, and c")).toBe(false);
            const threeOrMore = words({ pairSeparator: false, min: 3 });
            expect(whole(threeOrMore).test("a and b")).toBe(false);
            expect(whole(threeOrMore).test("a, b, and c")).toBe(true);
            expect(() => threeOrMore.parse("a and b")).toThrow(RGXError);
            expect(threeOrMore.parse("a, b, and c").length).toBe(3);
        });

        it("accept the preposition without requiring it when optionalPreposition is true", () => {
            const list = words({ optionalPreposition: true });
            for (const text of ["a", "a, b", "a, and b", "a, b, c", "a, b, and c"]) {
                expect([text, whole(list).test(text)]).toEqual([text, true]);
            }
            expect(whole(list).test("a, and b, c")).toBe(false);
            expect(list.parse("a, b, c").map(c => c.raw)).toEqual(["a", "b", "c"]);
            expect(list.parse("a, b, and c").map(c => c.raw)).toEqual(["a", "b", "c"]);

            const both = words({ optionalPreposition: true, pairSeparator: false, min: 2 });
            for (const text of ["a and b", "a, b", "a, b, c", "a, b, and c"]) {
                expect([text, whole(both).test(text)]).toEqual([text, true]);
                expect(both.parse(text).length).toBeGreaterThan(1);
            }
            expect(whole(both).test("a")).toBe(false);
        });

        it("are cloned and stored in JSON", () => {
            const list = words({ preposition: rgxGroup({ capturing: false }, ["and"]) });
            const clone = list.clone();
            expect(clone.preposition).not.toBe(list.preposition);
            expect(clone.padSeparator).toBe(true);
            expect(words({ pairSeparator: false, optionalPreposition: true }).clone()).toMatchObject({ pairSeparator: false, optionalPreposition: true });
            expect(clone.resolve()).toBe(list.resolve());
            expect(rgxList("a", ",").clone().preposition).toBeUndefined();

            registerRGXPartAlias("word", rgxPart(/\w+/));
            const json = rgxList(rgxPartAlias("word"), ",", { preposition: "or", padSeparator: true }).toJSON();
            expect(json.args![2]).toEqual({ min: 1, max: null, trailing: false, atomic: true, padSeparator: true, pairSeparator: true, optionalPreposition: false, preposition: "or" });
            const result = rgxTokenFromJSON(json) as RGXListToken;
            expect(result.parse("a, b, or c").map(c => c.raw)).toEqual(["a", "b", "c"]);
            expect((rgxList("a", ",").toJSON().args![2] as object)).not.toHaveProperty("preposition");

            const reject = (options: unknown) => () => RGXListToken.fromJSON({ $rgx: true, class: "RGXListToken", args: [["a"], ",", options as never] });
            expect(reject({ preposition: { nope: 1 } })).toThrow(/preposition/);
            expect(reject({ padSeparator: 1 })).toThrow(/padSeparator/);
            expect(reject({ pairSeparator: 1 })).toThrow(/pairSeparator/);
            expect(reject({ optionalPreposition: 1 })).toThrow(/optionalPreposition/);
            expect(RGXListToken.fromJSON({ $rgx: true, class: "RGXListToken", args: [["a"], ",", {}] }).hasPreposition()).toBe(false);
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
                args: [[{ alias: "number" }, { $rgx: true, source: "[a-z]+" }], ",", { min: 2, max: null, trailing: false, atomic: true, padSeparator: false, pairSeparator: true, optionalPreposition: false }]
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
