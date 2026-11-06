import {
    rgxa, rgxClassInit, RGXAtomicToken, rgxAtomic, rgxInterpolation, rgxTokenFromJSON, rgxTokenToJSON, rgxwa, rgxGroup, rgxSubpattern,
    rgxLookahead, rgxLookbehind, rgxRepeat, RGXRepeatToken, RGXClassToken, RGXInsertionRejectedError, RGXInvalidBackreferenceError,
    RGXReservedGroupNameError, RGXInvalidTokenError, RGXJSONClassToken, RGXNotSupportedError, RGXJSONClassArgsValidationFailedError, rgxPart, resolveRGXToken
} from "src/index";
import { ConstructFunction, rgxAtomicGroupPrefix } from "src/internal";
import { expectError } from "../utils";

rgxClassInit();

const start = rgxInterpolation("^");
const end = rgxInterpolation("$");

class TestClassToken extends RGXClassToken {
    toRgx() {
        return "test";
    }

    clone() {
        return new TestClassToken();
    }
}

function constructionTest(constructor: ConstructFunction<typeof RGXAtomicToken>) {
    it("constructs an instance of RGXAtomicToken with no tokens by default", () => {
        const instance = constructor();
        expect(instance).toBeInstanceOf(RGXAtomicToken);
        expect(instance.tokens).toEqual([]);
    });

    it("takes an array of tokens to concatenate, or a single token", () => {
        const token = new TestClassToken();
        expect(constructor([token, "a"]).tokens).toEqual([token, "a"]);
        expect(constructor(token).tokens).toEqual([token]);
    });
}

describe("RGXAtomicToken", () => {
    describe("constructor", () => constructionTest((...args) => new RGXAtomicToken(...args)));
    describe("construct function", () => constructionTest(rgxAtomic));

    describe("type guards", () => {
        it("checks and asserts instances", () => {
            expect(RGXAtomicToken.check(rgxAtomic("a"))).toBe(true);
            expect(RGXAtomicToken.check("a")).toBe(false);
            expect(() => RGXAtomicToken.assert(rgxAtomic("a"))).not.toThrow();
            expect(() => RGXAtomicToken.assert("a")).toThrow(RGXInvalidTokenError);
        });
    });

    describe("atomic", () => {
        it("wraps a class token in an atomic token", () => {
            const token = new TestClassToken();
            const atomic = token.atomic();
            expect(atomic).toBeInstanceOf(RGXAtomicToken);
            expect(atomic.tokens).toEqual([token]);
        });

        it("returns an atomic token itself", () => {
            const token = rgxAtomic("a");
            expect(token.atomic()).toBe(token);
        });
    });

    describe("toRgx", () => {
        it("resolves to nothing without tokens", () => {
            expect(rgxAtomic().toRgx()).toBeNull();
            expect(rgxAtomic([]).resolve()).toBe("");
        });

        it("resolves the same way every time", () => {
            const token = rgxAtomic(/a+/);
            expect(token.resolve()).toBe(token.resolve());
            expect(token.resolve({ groupWrap: false })).toBe(`(?=(?<${rgxAtomicGroupPrefix}000000>a+))\\k<${rgxAtomicGroupPrefix}000000>`);
        });

        it("doesn't give back characters once it has matched", () => {
            expect(rgxa([start, /a+/, "a", end]).test("aaa")).toBe(true);
            expect(rgxa([start, rgxAtomic(/a+/), "a", end]).test("aaa")).toBe(false);
            expect(rgxa([start, rgxAtomic(/a+/), "b", end]).test("aaab")).toBe(true);
        });

        it("commits to the first alternative that matches", () => {
            expect(rgxa([start, [/a/, /ab/], "c", end]).test("abc")).toBe(true);
            expect(rgxa([start, rgxAtomic([[/a/, /ab/]]), "c", end]).test("abc")).toBe(false);
        });

        it("can be used several times in a pattern, nested, and repeated", () => {
            const atomic = rgxAtomic(/a+/);
            const regex = rgxa([start, atomic, "-", atomic, "-", rgxAtomic([atomic, "b"]), "-", rgxRepeat(rgxAtomic(/ab/), 2), end]);
            expect(regex.test("a-aa-aab-abab")).toBe(true);
            expect(regex.source).toContain(`${rgxAtomicGroupPrefix}000003`);
        });

        it("works in a pattern placed in another pattern more than once", () => {
            const inner = rgxa([rgxAtomic(/a+/), "b"]);
            const regex = rgxa([start, inner, "-", inner, end]);
            expect(regex.test("aab-ab")).toBe(true);
            expect(regex.test("aa-ab")).toBe(false);
        });

        it("works with flags and inside other groups", () => {
            const as = rgxAtomic(rgxRepeat("a", 1, null));
            expect(rgxa([start, as, end], "i").test("AaA")).toBe(true);
            expect(rgxa([start, rgxGroup({ flags: "i" }, [as]), end], "v").test("AaA")).toBe(true);
            expect(rgxa([start, rgxLookahead(rgxAtomic("a"), false), /./, end]).test("b")).toBe(true);
            expect(rgxa([start, rgxLookahead(rgxAtomic("a"), false), /./, end]).test("a")).toBe(false);
        });
    });

    describe("lookbehinds", () => {
        it("can't be placed inside one", () => {
            expect(() => rgxa([rgxLookbehind(rgxAtomic("a")), "b"])).toThrow(RGXInsertionRejectedError);
            expect(() => rgxa([rgxLookbehind([rgxGroup({}, [rgxAtomic("a")])]), "b"])).toThrow(RGXInsertionRejectedError);
            const json = { $rgx: true, class: "RGXLookbehindToken", args: [[rgxTokenToJSON(rgxAtomic("a"))]] } as RGXJSONClassToken;
            expect(() => rgxa([json, "b"])).toThrow(RGXInsertionRejectedError);
        });

        it("rejects possessive repeats too", () => {
            expect(() => rgxa([rgxLookbehind(rgxRepeat("a", 1, null, false, true)), "b"])).toThrow(RGXInsertionRejectedError);
            expect(() => rgxa([rgxLookbehind(rgxRepeat("a", 1, null)), "b"])).not.toThrow();
        });
    });

    describe("references", () => {
        it("rejects numeric references to groups after an atomic group", () => {
            expectError(
                () => rgxa([rgxAtomic("a"), rgxGroup({}, ["b"]), rgxSubpattern(1)]),
                RGXInvalidBackreferenceError, e => expect(e.reason).toBe("numeric-after-atomic")
            );
            expectError(
                () => rgxa([rgxAtomic("a"), /(b)\1/]),
                RGXInvalidBackreferenceError, e => expect(e.reason).toBe("numeric-after-atomic")
            );
        });

        it("allows numeric references to groups before every atomic group, and named references", () => {
            expect(rgxa([rgxGroup({}, ["b"]), rgxAtomic("a"), rgxSubpattern(1)]).test("bab")).toBe(true);
            expect(rgxa([rgxAtomic("a"), rgxGroup({ name: "x" }, ["b"]), rgxSubpattern("x")]).test("abb")).toBe(true);
        });

        it("reserves the prefix in patterns with atomic groups", () => {
            expectError(
                () => rgxa([rgxAtomic("a"), rgxGroup({ name: `${rgxAtomicGroupPrefix}x` }, ["b"])]),
                RGXReservedGroupNameError, e => expect(e.groupName).toBe(`${rgxAtomicGroupPrefix}x`)
            );
            expectError(
                () => rgxa([rgxAtomic("a"), rgxInterpolation(`\\k<${rgxAtomicGroupPrefix}000000>`)]),
                RGXReservedGroupNameError, e => expect(e.groupName).toBe(`${rgxAtomicGroupPrefix}000000`)
            );
            // Without atomic groups, the names are left to the user.
            expect(() => rgxa([rgxGroup({ name: `${rgxAtomicGroupPrefix}x` }, ["b"])])).not.toThrow();
        });
    });

    describe("walker", () => {
        it("matches steps with atomic groups, leaving them out of the capture's groups", () => {
            const walker = rgxwa("aab", [rgxPart(rgxGroup({ capturing: false }, [rgxAtomic(/a+/), rgxGroup({ name: "b" }, ["b"])]))]);
            walker.walk();
            expect(walker.captures[0]!.raw).toBe("aab");
            expect(walker.captures[0]!.groups).toEqual({ b: "b" });
        });

        it("leaves out groups entirely when atomic groups are the only ones", () => {
            const walker = rgxwa("aa", [rgxAtomic(/a+/)]);
            walker.walk();
            expect(walker.captures[0]!.groups).toBeNull();
        });

        it("works in union steps", () => {
            const walker = rgxwa("ab", [[rgxPart(rgxAtomic([/a/, "c"])), rgxPart(rgxAtomic([/a/, "b"]))]]);
            walker.walk();
            expect(walker.captures[0]!.branch).toBe(1);
        });
    });

    describe("rgxIsRepeatable", () => {
        it("follows whether its tokens consume characters", () => {
            expect(rgxAtomic("a").rgxIsRepeatable).toBe(true);
            expect(rgxAtomic(rgxLookahead("a")).rgxIsRepeatable).toBe(false);
            expect(() => rgxRepeat(rgxAtomic(rgxLookahead("a")))).toThrow(RGXNotSupportedError);
        });

        it("assumes tokens that can't be resolved on their own consume characters", () => {
            expect(rgxAtomic(rgxInterpolation("(")).rgxIsRepeatable).toBe(true);
            expect(rgxAtomic({ toRgx: () => ({}) } as unknown as RGXClassToken).rgxIsRepeatable).toBe(true);
        });
    });

    describe("clone", () => {
        it("returns itself at depth 0", () => {
            const token = rgxAtomic("a");
            expect(token.clone(0)).toBe(token);
        });

        it("copies its tokens", () => {
            const inner = new TestClassToken();
            const token = rgxAtomic([inner]);
            const clone = token.clone();
            expect(clone).not.toBe(token);
            expect(clone.tokens).not.toBe(token.tokens);
            expect(clone.tokens[0]).not.toBe(inner);
            expect(clone.resolve()).toBe(token.resolve());
        });
    });

    describe("JSON", () => {
        it("round trips", () => {
            const token = rgxAtomic(["a", /b/]);
            const json = token.toJSON();
            expect(json).toEqual({ $rgx: true, class: "RGXAtomicToken", args: [["a", { $rgx: true, source: "b" }]] });
            const result = rgxTokenFromJSON(json) as RGXAtomicToken;
            expect(result).toBeInstanceOf(RGXAtomicToken);
            expect(resolveRGXToken(result)).toBe(resolveRGXToken(token));
        });

        it("defaults to no tokens and validates its args", () => {
            expect(RGXAtomicToken.fromJSON({ $rgx: true, class: "RGXAtomicToken" }).tokens).toEqual([]);
            expect(() => RGXAtomicToken.fromJSON({ $rgx: true, class: "RGXAtomicToken", args: ["a", "b"] })).toThrow(RGXJSONClassArgsValidationFailedError);
            expect(() => RGXAtomicToken.fromJSON({ $rgx: true, class: "RGXAtomicToken", args: [{ nope: 1 }] })).toThrow(RGXJSONClassArgsValidationFailedError);
        });
    });
});

describe("possessive repeats", () => {
    it("don't give back characters once they have matched", () => {
        expect(rgxa([start, rgxRepeat("a", 1, null), "a", end]).test("aaa")).toBe(true);
        expect(rgxa([start, rgxRepeat("a", 1, null, false, true), "a", end]).test("aaa")).toBe(false);
        expect(rgxa([start, rgxRepeat("a", 1, null, false, true), "b", end]).test("aab")).toBe(true);
    });

    it("can be lazy, matching as few as they can", () => {
        expect(rgxa([start, rgxRepeat("a", 1, null, true, true), "a", end]).test("aa")).toBe(true);
        expect(rgxa([start, rgxRepeat("a", 1, null, true, true), end]).test("aa")).toBe(false);
    });

    it("are set through repeat() and optional()", () => {
        const token = new TestClassToken();
        expect(token.repeat(1, null, false, true).possessive).toBe(true);
        expect(token.repeat().possessive).toBe(false);
        expect(token.optional(false, true).possessive).toBe(true);
    });

    it("keep their own possessiveness when made optional", () => {
        const possessive = rgxRepeat("a", 1, null, false, true);
        const optional = possessive.optional();
        expect(optional).not.toBe(possessive);
        expect(optional.token).toBe(possessive);
        expect(optional.possessive).toBe(false);

        // Making a plain repeat possessive and optional wraps it.
        const plain = rgxRepeat("a", 0, null);
        expect(plain.optional(false, true).token).toBe(plain);
    });

    it("are cloned with their possessiveness", () => {
        expect(rgxRepeat("a", 1, null, false, true).clone().possessive).toBe(true);
    });

    it("store possessive in JSON only when it is set", () => {
        expect(rgxRepeat("a", 1, null).toJSON().args).toEqual(["a", 1, null, false]);
        const token = rgxRepeat("a", 1, null, false, true);
        expect(token.toJSON().args).toEqual(["a", 1, null, false, true]);
        const result = RGXRepeatToken.fromJSON(token.toJSON());
        expect(result.possessive).toBe(true);
        expect(result.resolve()).toBe(token.resolve());
        expect(RGXRepeatToken.fromJSON({ $rgx: true, class: "RGXRepeatToken", args: ["a"] }).possessive).toBe(false);
        expect(() => RGXRepeatToken.fromJSON({ $rgx: true, class: "RGXRepeatToken", args: ["a", 1, 1, false, "x"] })).toThrow(/possessive/);
    });
});
