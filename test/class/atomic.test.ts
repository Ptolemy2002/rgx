import {
    rgxa, rgxClassInit, RGXGroupToken, rgxAtomic, rgxInterpolation, rgxTokenFromJSON, rgxTokenToJSON, rgxwa, rgxGroup, rgxSubpattern,
    rgxLookahead, rgxLookbehind, rgxRepeat, RGXRepeatToken, RGXClassToken, RGXInsertionRejectedError, RGXInvalidBackreferenceError,
    RGXReservedGroupNameError, RGXInvalidTokenError, RGXJSONClassToken, RGXNotSupportedError, RGXJSONClassArgsValidationFailedError, rgxPart, resolveRGXToken
} from "src/index";
import { rgxAtomicGroupPrefix } from "src/internal";
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

describe("atomic groups", () => {
    describe("rgxAtomic", () => {
        it("constructs a non-capturing atomic group with no tokens by default", () => {
            const instance = rgxAtomic();
            expect(instance).toBeInstanceOf(RGXGroupToken);
            expect(instance.isAtomic).toBe(true);
            expect(instance.capturing).toBe(false);
            expect(instance.tokens).toEqual([]);
        });

        it("takes an array of tokens to concatenate, or a single token", () => {
            const token = new TestClassToken();
            expect(rgxAtomic([token, "a"]).tokens).toEqual([token, "a"]);
            expect(rgxAtomic(token).tokens).toEqual([token]);
        });
    });

    describe("the atomic option", () => {
        it("defaults to false", () => {
            expect(rgxGroup().isAtomic).toBe(false);
            expect(rgxGroup({ atomic: true }).isAtomic).toBe(true);
        });

        it("keeps the group's name, capture and flags", () => {
            const named = rgxa([start, rgxGroup({ name: "x", atomic: true }, [/a+/]), "a", end]);
            expect(named.test("aaa")).toBe(false);
            expect(rgxa([rgxGroup({ name: "x", atomic: true }, [/a+/]), "b"]).exec("aab")!.groups).toEqual({ x: "aa" });
            expect([...rgxa([rgxGroup({ atomic: true }, [/a+/]), "b"]).exec("aab")!]).toEqual(["aab", "aa"]);
            expect(rgxa([start, rgxGroup({ capturing: false, flags: "i", atomic: true }, [rgxRepeat("a", 1, null)]), "a", end]).test("AAa")).toBe(false);
            expect(rgxa([start, rgxGroup({ capturing: false, flags: "i", atomic: true }, [rgxRepeat("a", 1, null)]), "b", end]).test("AAb")).toBe(true);
        });
    });

    describe("atomic", () => {
        it("wraps a class token in a non-capturing atomic group", () => {
            const token = new TestClassToken();
            const atomic = token.atomic();
            expect(atomic).toBeInstanceOf(RGXGroupToken);
            expect(atomic.isAtomic).toBe(true);
            expect(atomic.capturing).toBe(false);
            expect(atomic.tokens).toEqual([token]);
        });

        it("returns an atomic group itself", () => {
            const token = rgxAtomic("a");
            expect(token.atomic()).toBe(token);
        });

        it("makes a copy of any other group atomic", () => {
            const inner = new TestClassToken();
            const group = rgxGroup({ name: "x" }, [inner]);
            const atomic = group.atomic();
            expect(atomic).not.toBe(group);
            expect(group.isAtomic).toBe(false);
            expect(atomic.isAtomic).toBe(true);
            expect(atomic.name).toBe("x");
            expect(atomic.tokens[0]).toBe(inner);
        });
    });

    describe("toRgx", () => {
        it("is an empty group without tokens", () => {
            expect(rgxAtomic().resolve()).toBe("(?:)");
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
            expect(regex.source).toContain(`${rgxAtomicGroupPrefix}final_4`);
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

    describe("matches", () => {
        it("leave atomic groups out of the match, its groups and its indices", () => {
            const regex = rgxa([rgxAtomic("a"), rgxGroup({}, ["b"]), rgxAtomic(["c", rgxGroup({ name: "n" }, ["d"])])], "d");
            const match = regex.exec("abcd")!;
            expect([...match]).toEqual(["abcd", "b", "d"]);
            expect(match.groups).toEqual({ n: "d" });
            expect([...(match as unknown as { indices: number[][] }).indices]).toEqual([[0, 4], [1, 2], [3, 4]]);
        });

        it("are used by the methods built on exec", () => {
            const regex = rgxa([rgxAtomic("a"), rgxGroup({}, ["b"])], "g");
            expect("abab".replace(regex, "[$1]")).toBe("[b][b]");
            expect([..."abab".matchAll(regex)].map(match => [...match])).toEqual([["ab", "b"], ["ab", "b"]]);
            expect("xaby".split(rgxa([rgxAtomic("a"), rgxGroup({}, ["b"])]))).toEqual(["x", "b", "y"]);
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
        it("leaves atomic groups out of the numbers numeric references count", () => {
            const regex = rgxa([start, rgxAtomic("a"), rgxGroup({}, ["b"]), rgxAtomic(["c", rgxGroup({}, ["d"])]), rgxSubpattern(1), rgxSubpattern(2), end]);
            expect(regex.test("abcdbd")).toBe(true);
            expect(regex.test("abcddb")).toBe(false);
            expect(rgxa([start, rgxAtomic("a"), /(b)\1/, end]).test("abb")).toBe(true);
            expect(rgxa([rgxGroup({}, ["b"]), rgxAtomic("a"), rgxSubpattern(1)]).test("bab")).toBe(true);
            expect(rgxa([rgxAtomic("a"), rgxGroup({ name: "x" }, ["b"]), rgxSubpattern("x")]).test("abb")).toBe(true);
        });

        it("keeps a reference followed by a digit apart from it", () => {
            const regex = rgxa([start, rgxAtomic("a"), rgxGroup({}, ["b"]), rgxSubpattern(1), "1", end]);
            expect(regex.source).toContain("(?:\\2)1");
            expect(regex.test("abb1")).toBe(true);
        });

        it("rejects numbers that only count atomic groups", () => {
            expectError(
                () => rgxa([rgxAtomic("a"), rgxGroup({}, ["b"]), rgxSubpattern(2)]),
                RGXInvalidBackreferenceError, e => expect(e.reason).toBe("missing-group")
            );
            expectError(
                () => rgxa([rgxAtomic("a"), rgxGroup({}, ["b"]), rgxInterpolation("\\2")]),
                RGXInvalidBackreferenceError, e => {
                    expect(e.reason).toBe("missing-group");
                    expect(e.reference).toBe(2);
                }
            );
        });

        it("checks references against the groups they count", () => {
            expectError(
                () => rgxa([rgxAtomic("a"), rgxSubpattern(1), rgxGroup({}, ["b"])]),
                RGXInvalidBackreferenceError, e => expect(e.reason).toBe("before-group")
            );
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
            // The final names of atomic groups in a compiled pattern are ordinary groups.
            const compiled = new RegExp(rgxa([rgxAtomic("a"), rgxGroup({}, ["b"]), rgxSubpattern(1)]).source);
            const placed = rgxa([start, compiled, rgxAtomic("c"), rgxGroup({}, ["d"]), rgxSubpattern(3), end]);
            expect(placed.source).toContain(`${rgxAtomicGroupPrefix}final_1`);
            expect(placed.test("abbcdd")).toBe(true);
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
        it("copies its tokens and stays atomic", () => {
            const inner = new TestClassToken();
            const token = rgxAtomic([inner]);
            const clone = token.clone();
            expect(clone).not.toBe(token);
            expect(clone.tokens).not.toBe(token.tokens);
            expect(clone.tokens[0]).not.toBe(inner);
            expect(clone.isAtomic).toBe(true);
            expect(clone.resolve()).toBe(token.resolve());
        });
    });

    describe("JSON", () => {
        it("stores atomic only when it is set", () => {
            expect(rgxGroup({}, ["a"]).toJSON().args![0]).not.toHaveProperty("atomic");
            const token = rgxAtomic(["a", /b/]);
            const json = token.toJSON();
            expect(json.args![0]).toEqual({ name: null, capturing: false, flags: null, atomic: true });
            const result = rgxTokenFromJSON(json) as RGXGroupToken;
            expect(result.isAtomic).toBe(true);
            expect(resolveRGXToken(result)).toBe(resolveRGXToken(token));
        });

        it("validates the option", () => {
            expect(() => RGXGroupToken.fromJSON({ $rgx: true, class: "RGXGroupToken", args: [{ atomic: "yes" }] })).toThrow(RGXJSONClassArgsValidationFailedError);
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
