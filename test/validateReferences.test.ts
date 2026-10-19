import { RGXDuplicateGroupNameError, RGXInvalidBackreferenceError, RGXReservedGroupNameError } from "src/errors";
import { assertValidRegexReferences } from "src/internal/validateReferences";

function reasonFor(source: string, references: (string | number)[] = [], options = {}) {
    try {
        assertValidRegexReferences(source, references, options);
        return null;
    } catch (e) {
        if (!(e instanceof RGXInvalidBackreferenceError)) throw e;
        return e.reason;
    }
}

describe("assertValidRegexReferences", () => {
    it("accepts references that can match what their group captured", () => {
        for (const source of [
            "(a)\\1", "(?<a>x)\\k<a>", "(a)(b)\\2\\1", "(?:(a)|b)\\1", "(?<a>x)|(?<a>y)\\k<a>", "(?<a>x)(?:y|\\k<a>)",
            "(?<=\\1(a))", "(?=(a))\\1", "(?!(a)\\1)", "x", ""
        ]) {
            expect(reasonFor(source)).toBeNull();
        }
    });

    it("rejects recorded references with no matching group", () => {
        // The engine reads both of these as literal text instead of references.
        expect(reasonFor("\\k<x>a", ["x"])).toBe("missing-group");
        expect(reasonFor("(a)\\5", [5])).toBe("missing-group");
        expect(reasonFor("(a)\\1", [1])).toBeNull();
        expect(reasonFor("(?<x>a)\\k<x>", ["x"])).toBeNull();
    });

    it("rejects references before their group", () => {
        expect(reasonFor("\\1(a)")).toBe("before-group");
        // Captures are cleared at the start of each repetition.
        expect(reasonFor("(?:\\1b|(a))+")).toBe("other-branch");
        expect(reasonFor("\\k<a>(?<a>x)")).toBe("before-group");
    });

    it("rejects references after their group inside a lookbehind, which is matched backwards", () => {
        expect(reasonFor("(?<=(a)\\1)")).toBe("before-group");
    });

    it("rejects references inside their own group", () => {
        expect(reasonFor("(a\\1)")).toBe("inside-group");
    });

    it("rejects references to a group in another alternative", () => {
        expect(reasonFor("(?<a>x)|\\k<a>")).toBe("other-branch");
        expect(reasonFor("(?:(a)|\\1)")).toBe("other-branch");
    });

    it("rejects references to a group inside a negative lookaround the reference isn't in", () => {
        expect(reasonFor("(?!(a))\\1")).toBe("negative-lookaround");
    });

    it("accepts a name shared by several groups when one of them works", () => {
        expect(reasonFor("(?:(?<a>x)|(?<a>y))\\k<a>")).toBeNull();
        expect(reasonFor("(?<a>x)\\k<a>|(?<a>y)")).toBeNull();
        expect(reasonFor("\\k<a>(?:(?<a>x)|(?<a>y))")).toBe("before-group");
    });

    it("rejects numeric references when asked", () => {
        expect(reasonFor("(a)\\1", [], { rejectNumeric: true })).toBe("numeric-in-branches");
        expect(reasonFor("(a)", [1], { rejectNumeric: true })).toBe("numeric-in-branches");
        expect(reasonFor("(?<a>x)\\k<a>", ["a"], { rejectNumeric: true })).toBeNull();
    });

    it("rejects reserved group names", () => {
        expect(() => assertValidRegexReferences("(?<rgx_branch_0>a)", [], { reservedGroupPrefix: "rgx_branch_" })).toThrow(RGXReservedGroupNameError);
        expect(() => assertValidRegexReferences("(?<rgx_branch_0>a)", [])).not.toThrow();
        expect(() => assertValidRegexReferences("(?<a>a)(b)", [], { reservedGroupPrefix: "rgx_branch_" })).not.toThrow();
    });

    it("throws a clear error for duplicate group names", () => {
        const call = () => assertValidRegexReferences("(?<year>x)(?<year>y)", []);
        expect(call).toThrow(RGXDuplicateGroupNameError);
        expect(call).toThrow(/Group name: "year"/);
        expect(() => assertValidRegexReferences("(?<a>x)[a](?<a>y)", [], { unicodeSets: true })).toThrow(RGXDuplicateGroupNameError);
    });

    it("leaves other invalid sources to the regex constructor", () => {
        expect(() => assertValidRegexReferences("(a", ["x"])).not.toThrow();
    });

    it("uses the unicode reading of the source when asked", () => {
        // "\u{1}" is a single character with the u flag, so there is no reference to check.
        expect(reasonFor("\\u{1}(a)", [], { unicode: true })).toBeNull();
    });
});
