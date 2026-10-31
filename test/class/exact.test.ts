import rgx, {
    applyRGXPatternTransformers, createRGXBounds, exactRegex, ExtRegExp, regexWithFlags, resolveRGXToken, rgxa, rgxClassInit,
    RGXExactToken, rgxExact, rgxInterpolation, rgxLexer, rgxTokenFromJSON, rgxTokenToJSON, rgxw, rgxwa, rgxConcat,
    RGXReservedGroupNameError, RGXInvalidTokenError, RGXJSONClassArgsValidationFailedError, rgxGroup, rgxSubpattern, isRGXJSONLiteralToken,
    rgxPart
} from "src/index";
import { ConstructFunction } from "src/internal";
import {
    findRGXExactMarkers, nextRGXExactMarkerName, rgxExactMarkerReplacement, withRGXExactStrings, isRGXExactStringsActive
} from "src/internal/exactMarkers";

rgxClassInit();

// Anchors written as raw syntax, so tests can match whole strings.
const start = rgxInterpolation("^");
const end = rgxInterpolation("$");

function constructionTest(constructor: ConstructFunction<typeof RGXExactToken>) {
    it("constructs an instance of RGXExactToken", () => {
        const instance = constructor("abc");
        expect(instance).toBeInstanceOf(RGXExactToken);
        expect(instance.text).toBe("abc");
    });

    it("rejects text that isn't a string", () => {
        expect(() => constructor(5 as unknown as string)).toThrow(RGXInvalidTokenError);
    });
}

describe("RGXExactToken", () => {
    describe("type guards", () => {
        it("accepts instances", () => {
            expect(RGXExactToken.check(new RGXExactToken("a"))).toBe(true);
            expect(() => RGXExactToken.assert(new RGXExactToken("a"))).not.toThrow();
        });

        it("rejects other values", () => {
            expect(RGXExactToken.check("a")).toBe(false);
            expect(() => RGXExactToken.assert("a")).toThrow(RGXInvalidTokenError);
        });
    });

    describe("constructor", () => constructionTest((...args) => new RGXExactToken(...args)));
    describe("construct function", () => constructionTest(rgxExact));

    describe("toRgx", () => {
        it("marks the escaped text with a reserved group", () => {
            expect(rgxExact("a.b").toRgx().source).toBe("(?<rgx_exact_0>a\\.b)");
        });

        it("resolves empty text to nothing", () => {
            expect(exactRegex("")).toBe("");
            expect(rgxa([rgxExact("")]).source).toBe("(?:)");
        });

        it("names each marker uniquely in one resolution", () => {
            expect(resolveRGXToken([rgxExact("a"), rgxExact("b")])).toBe("(?:(?<rgx_exact_0>a)|(?<rgx_exact_1>b))");
            expect(rgxConcat([rgxExact("a"), rgxExact("b")])).toBe("(?<rgx_exact_0>a)(?<rgx_exact_1>b)");
        });

        it("starts naming again in each resolution", () => {
            expect(resolveRGXToken(rgxExact("a"))).toBe("(?<rgx_exact_0>a)");
            expect(resolveRGXToken(rgxExact("a"))).toBe("(?<rgx_exact_0>a)");
        });
    });

    describe("clone", () => {
        it("returns itself with depth 0", () => {
            const token = rgxExact("a");
            expect(token.clone(0)).toBe(token);
        });

        it("copies the text", () => {
            const token = rgxExact("a");
            const clone = token.clone();
            expect(clone).not.toBe(token);
            expect(clone.text).toBe("a");
        });
    });

    describe("JSON", () => {
        it("round-trips", () => {
            const json = rgxExact("a").toJSON();
            expect(json).toEqual({ $rgx: true, class: "RGXExactToken", args: ["a"] });
            const restored = rgxTokenFromJSON(json);
            expect(restored).toBeInstanceOf(RGXExactToken);
            expect((restored as RGXExactToken).text).toBe("a");
        });

        it("rejects invalid args", () => {
            expect(() => RGXExactToken.fromJSON({ $rgx: true, class: "RGXExactToken", args: [] })).toThrow(RGXJSONClassArgsValidationFailedError);
            expect(() => RGXExactToken.fromJSON({ $rgx: true, class: "RGXExactToken", args: [1] })).toThrow(RGXJSONClassArgsValidationFailedError);
        });
    });
});

describe("exact text in patterns", () => {
    it("ignores the i flag", () => {
        const exact = rgxa([start, rgxExact("Ab"), end], "i");
        expect(exact.test("Ab")).toBe(true);
        expect(exact.test("ab")).toBe(false);
        expect(rgxa([start, "Ab", end], "i").test("ab")).toBe(true);
    });

    it("leaves the tokens around it case-insensitive", () => {
        const exact = rgxa([start, "a", rgxExact("B"), "c", end], "i");
        expect(exact.test("ABC")).toBe(true);
        expect(exact.test("Abc")).toBe(false);
    });

    it("ignores custom flags like a", () => {
        const exact = rgxa([start, rgxExact("é"), "é", end], "a");
        expect(exact.test("éé")).toBe(true);
        expect(exact.test("ée")).toBe(true);
        expect(exact.test("eé")).toBe(false);
    });

    it("ignores the i flag of an enclosing group", () => {
        const exact = rgxa([start, rgxGroup({ flags: "i" }, [rgxExact("A"), "b"]), end]);
        expect(exact.test("AB")).toBe(true);
        expect(exact.test("aB")).toBe(false);
    });

    it("adds no capture groups to the compiled pattern", () => {
        const exact = rgxa([rgxExact("a"), /(b)/i, rgxSubpattern(1)], "i");
        expect(exact.source).not.toContain("rgx_exact_");
        const match = exact.exec("aBB")!;
        expect(match).not.toBeNull();
        expect(match[1]).toBe("B");
        expect(match.groups).toBeUndefined();
    });

    it("doesn't turn the i flag off for text without letters", () => {
        expect(rgxa([rgxExact("1-2")], "i").source).toBe("(?:1\\x2d2)");
        expect(rgxa([rgxExact("a")], "i").source).toBe("(?-i:a)");
    });

    it("keeps the markers in the original and marked sources", () => {
        const exact = rgxa([rgxExact("é")], "a");
        expect(exact.exactMarkers).toBe(true);
        expect(exact.originalSource).toBe("(?<rgx_exact_0>é)");
        expect(exact.markedSource).toBe("(?<rgx_exact_0>é)");
        expect(rgxa(["a"]).exactMarkers).toBe(false);
    });

    it("keeps its protection when rebuilt", () => {
        const exact = rgxa([start, rgxExact("é"), end]);
        const rebuilt = regexWithFlags(exact, "ai");
        expect(rebuilt.exactMarkers).toBe(true);
        expect(rebuilt.test("é")).toBe(true);
        expect(rebuilt.test("e")).toBe(false);
        expect(rebuilt.test("É")).toBe(false);

        const transformed = applyRGXPatternTransformers(exact, []);
        expect(transformed.exactMarkers).toBe(true);
    });

    it("keeps its protection when placed in another pattern", () => {
        const inner = rgxa([rgxExact("é"), rgxExact("x")]);
        const outer = rgxa([start, inner, rgxExact("é"), "é", end], "ai");
        expect(outer.markedSource).toContain("rgx_exact_2");
        expect(outer.test("éxéé")).toBe(true);
        expect(outer.test("éxéE")).toBe(true);
        expect(outer.test("exéé")).toBe(false);
        expect(outer.test("éXéé")).toBe(false);
        expect(outer.test("éxeé")).toBe(false);
    });

    it("leaves marker groups alone in an ExtRegExp that doesn't have exact text", () => {
        const regex = new ExtRegExp("(?<rgx_exact_0>a)", "i");
        expect(regex.exactMarkers).toBe(false);
        expect(regex.exec("A")!.groups).toEqual({ rgx_exact_0: "A" });
    });

    it("treats marker groups as exact text in an ExtRegExp told to", () => {
        const regex = new ExtRegExp("^(?<rgx_exact_0>a)$", "i", null, true);
        expect(regex.test("A")).toBe(false);
        expect(regex.test("a")).toBe(true);
    });

    describe("reserved names", () => {
        it("rejects groups with the prefix in a pattern with exact text", () => {
            expect(() => rgxa([rgxExact("a"), /(?<rgx_exact_9>b)/])).toThrow(RGXReservedGroupNameError);
        });

        it("allows groups with the prefix in a pattern without exact text", () => {
            const regex = rgxa([/(?<rgx_exact_9>b)/]);
            expect(regex.exec("b")!.groups).toEqual({ rgx_exact_9: "b" });
        });
    });

    describe("in tokens that repeat their contents", () => {
        it("works as the terminal of an exclusion", () => {
            const token = rgxGroup({}, ["a"]).subtract("ex", ["b"], rgxExact("Z"));
            const regex = rgxa([start, token, end], "i");
            expect(regex.test("aZ")).toBe(true);
            expect(regex.test("az")).toBe(false);
        });

        it("works in bounds", () => {
            const [startBound, endBound] = createRGXBounds(rgxExact("A"), rgxExact("-"), "i");
            const regex = rgxa([startBound, rgxExact("A"), endBound], "i");
            expect(regex.test("A")).toBe(true);
            expect(regex.test("a")).toBe(false);
        });
    });

    describe("JSON", () => {
        it("stores and restores whether an ExtRegExp has exact text", () => {
            const json = rgxTokenToJSON(rgxa([rgxExact("A")]));
            expect(json).toEqual({ $rgx: true, source: "(?<rgx_exact_0>A)", exactMarkers: true });
            const restored = rgxTokenFromJSON(json) as ExtRegExp;
            expect(restored.exactMarkers).toBe(true);
            expect(regexWithFlags(restored, "i").test("a")).toBe(false);
        });

        it("compiles exact text when a token is stored by resolving it", () => {
            expect(rgxTokenToJSON({ toRgx: () => rgxExact("A") })).toEqual({ $rgx: true, source: "(?-i:A)" });
        });

        it("rejects a JSON literal whose exactMarkers isn't a boolean", () => {
            expect(isRGXJSONLiteralToken({ $rgx: true, source: "a", exactMarkers: "yes" })).toBe(false);
        });
    });
});

describe("the exact option", () => {
    it("makes native tokens exact in rgx", () => {
        const regex = rgx("i", { exact: true })`${start}Ab${1}${end}`;
        expect(regex.test("Ab1")).toBe(true);
        expect(regex.test("ab1")).toBe(false);
        expect(rgx("i")`${start}Ab${end}`.test("ab")).toBe(true);
    });

    it("leaves template text alone when not verbatim", () => {
        const regex = rgx("i", { exact: true, verbatim: false })`^a${"B"}$`;
        expect(regex.test("AB")).toBe(true);
        expect(regex.test("Ab")).toBe(false);
    });

    it("makes native tokens exact in rgxa", () => {
        expect(rgxa([start, "A", end], "i", { exact: true }).test("a")).toBe(false);
    });

    it("makes native tokens exact in walkers", () => {
        const walker = rgxwa("aB", ["a", rgxExact("B")], { exact: true });
        walker.walk();
        expect(walker.captures.map(capture => capture.raw)).toEqual(["a", "B"]);
        expect(walker.clone().exact).toBe(true);

        const union = rgxwa("B", [[rgxPart(["a", rgxGroup({ flags: "i" }, ["b"])]), "c"]], { exact: true });
        expect(() => union.walk()).toThrow();
        const caseless = rgxwa("B", [[rgxPart(["a", rgxGroup({ flags: "i" }, ["b"])]), "c"]]);
        caseless.walk();
        expect(caseless.captures[0]!.raw).toBe("B");

        const tagged = rgxw("ab", { exact: true })`a${"b"}`;
        tagged.walk();
        expect(tagged.captures.map(capture => capture.raw)).toEqual(["a", "b", ""]);
    });

    it("resolves the text of a walker step with a dynamic part exactly", () => {
        const caseless = () => rgxGroup({ flags: "i" }, ["a"]);
        const walker = rgxwa("A", [rgxPart(caseless)], { exact: true });
        expect(() => walker.walk()).toThrow();
        const plain = rgxwa("A", [rgxPart(caseless)]);
        plain.walk();
        expect(plain.captures[0]!.raw).toBe("A");
    });
});

describe("exact text in lexers", () => {
    it("matches resolve definitions", () => {
        for (const resolveOnce of [true, false]) {
            const lexer = rgxLexer("Ab", { default: [{ id: "word", type: "resolve", token: [rgxExact("Ab")] }] }, 0, { resolveOnce });
            expect(lexer.consume()!.raw).toBe("Ab");
        }
    });
});

describe("exact marker internals", () => {
    it("names markers from 0 outside of a build", () => {
        expect(nextRGXExactMarkerName()).toBe("rgx_exact_0");
        expect(exactRegex("a")).toBe("(?<rgx_exact_0>a)");
    });

    it("keeps the setting in effect for null", () => {
        expect(withRGXExactStrings(true, () => withRGXExactStrings(null, isRGXExactStringsActive))).toBe(true);
    });

    it("finds no markers in a source that isn't a valid regex", () => {
        expect(findRGXExactMarkers("(?<rgx_exact_0>a", null, {})).toEqual([]);
        expect(findRGXExactMarkers("(?<a>a)", null, {})).toEqual([]);
    });

    it("finds markers in sources only valid in another unicode mode", () => {
        expect(findRGXExactMarkers("(?<rgx_exact_0>a)\\p{L}", null, {})).toHaveLength(1);
    });

    it("writes exact text so it ignores the i flag", () => {
        expect(rgxExactMarkerReplacement("a")).toBe("(?-i:a)");
        expect(rgxExactMarkerReplacement("\\x2d")).toBe("(?:\\x2d)");
    });
});
