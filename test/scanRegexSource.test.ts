import { hasRegexParenErrors, isSingletonRegexSource, scanRegexSource, toSingletonRegexSource } from "src/internal/scanRegexSource";

describe("scanRegexSource", () => {
    it("counts top-level units", () => {
        expect(scanRegexSource("")).toEqual({ depth: 0, unmatchedClose: false, topLevelUnits: 0 });
        expect(scanRegexSource("a")).toEqual({ depth: 0, unmatchedClose: false, topLevelUnits: 1 });
        expect(scanRegexSource("a+")).toEqual({ depth: 0, unmatchedClose: false, topLevelUnits: 2 });
        expect(scanRegexSource("(a|b)[c]\\d")).toEqual({ depth: 0, unmatchedClose: false, topLevelUnits: 3 });
    });

    it("tracks unterminated groups and unmatched closing parentheses", () => {
        expect(scanRegexSource("((a)")).toEqual({ depth: 1, unmatchedClose: false, topLevelUnits: 1 });
        expect(scanRegexSource("a)b")).toEqual({ depth: 0, unmatchedClose: true, topLevelUnits: 3 });
    });

    it("ignores parentheses in escapes and character classes", () => {
        expect(scanRegexSource("\\(a[()\\]]")).toEqual({ depth: 0, unmatchedClose: false, topLevelUnits: 3 });
    });

    it("only nests character classes with the v flag", () => {
        expect(scanRegexSource("[[a]]").topLevelUnits).toBe(2);
        expect(scanRegexSource("[[a]]", { unicodeSets: true }).topLevelUnits).toBe(1);
    });

    it("reads multi-character escapes as one unit", () => {
        expect(scanRegexSource("\\u0041").topLevelUnits).toBe(1);
        expect(scanRegexSource("\\x41").topLevelUnits).toBe(1);
        expect(scanRegexSource("\\cJ").topLevelUnits).toBe(1);
    });

    it("only reads unicode escapes as one unit with the u or v flag", () => {
        for (const escape of ["\\u{1F600}", "\\p{L}", "\\P{Script=Greek}", "\\k<name>"]) {
            expect(scanRegexSource(escape).topLevelUnits).toBeGreaterThan(1);
            expect(scanRegexSource(escape, { unicode: true }).topLevelUnits).toBe(1);
            expect(scanRegexSource(escape, { unicodeSets: true }).topLevelUnits).toBe(1);
        }
    });

    it("falls back to two-character escapes when a multi-character escape is malformed", () => {
        expect(scanRegexSource("\\u00G1").topLevelUnits).toBe(5);
        expect(scanRegexSource("\\u{G}", { unicode: true }).topLevelUnits).toBe(4);
    });
});

describe("hasRegexParenErrors", () => {
    it("detects unterminated groups and unmatched closing parentheses", () => {
        expect(hasRegexParenErrors("(a")).toBe(true);
        expect(hasRegexParenErrors("a)")).toBe(true);
        expect(hasRegexParenErrors("(a)")).toBe(false);
    });

    it("treats '[' inside a character class as a literal without the v flag", () => {
        expect(hasRegexParenErrors("[[](a")).toBe(true);
        expect(hasRegexParenErrors("[[](a", { unicodeSets: true })).toBe(false);
    });
});

describe("isSingletonRegexSource", () => {
    it("accepts single characters, escapes, character classes, and groups", () => {
        for (const source of ["a", ".", "\\d", "\\u0041", "[a-z]", "[^\\]]", "(ab)", "(?:a|b)", "(?<name>a)", "(?i:a)"]) {
            expect(isSingletonRegexSource(source)).toBe(true);
        }
    });

    it("rejects sources with more than one top-level unit", () => {
        for (const source of ["", "ab", "a+", "a|b", "(a)(b)", "(a)+", "[a]b"]) {
            expect(isSingletonRegexSource(source)).toBe(false);
        }
    });

    it("rejects sources with paren errors", () => {
        expect(isSingletonRegexSource("(a")).toBe(false);
        expect(isSingletonRegexSource(")")).toBe(false);
    });

    it("rejects units that can't take a quantifier", () => {
        for (const source of ["^", "$", "|", "*", "{", "]", "\\b", "\\B", "(?=a)", "(?!a)", "(?<=a)", "(?<!a)"]) {
            expect(isSingletonRegexSource(source)).toBe(false);
        }
    });
});

describe("toSingletonRegexSource", () => {
    it("leaves singletons that are not non-capturing groups alone", () => {
        expect(toSingletonRegexSource("a")).toBe("a");
        expect(toSingletonRegexSource("(a)")).toBe("(a)");
        expect(toSingletonRegexSource("(?i:a)")).toBe("(?i:a)");
    });

    it("wraps sources that are not singletons", () => {
        expect(toSingletonRegexSource("ab")).toBe("(?:ab)");
        expect(toSingletonRegexSource("^")).toBe("(?:^)");
    });

    it("removes non-capturing groups that only wrap a singleton", () => {
        expect(toSingletonRegexSource("(?:a)")).toBe("a");
        expect(toSingletonRegexSource("(?:(?:[a]))")).toBe("[a]");
        expect(toSingletonRegexSource("(?:(a))")).toBe("(a)");
    });

    it("keeps non-capturing groups that wrap a non-singleton", () => {
        expect(toSingletonRegexSource("(?:ab)")).toBe("(?:ab)");
        expect(toSingletonRegexSource("(?:(?:ab))")).toBe("(?:ab)");
    });
});
