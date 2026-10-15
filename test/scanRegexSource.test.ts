import { hasRegexParenErrors, scanOptionsFromFlags, scanRegexSource } from "src/internal/scanRegexSource";

describe("scanRegexSource", () => {
    it("tracks unterminated groups and unmatched closing parentheses", () => {
        expect(scanRegexSource("")).toEqual({ depth: 0, unmatchedClose: false });
        expect(scanRegexSource("((a)")).toEqual({ depth: 1, unmatchedClose: false });
        expect(scanRegexSource("a)b")).toEqual({ depth: 0, unmatchedClose: true });
        expect(scanRegexSource("(a|b)[c]\\d")).toEqual({ depth: 0, unmatchedClose: false });
    });

    it("ignores parentheses in escapes and character classes", () => {
        expect(scanRegexSource("\\(a[()\\]]")).toEqual({ depth: 0, unmatchedClose: false });
        expect(scanRegexSource("[\\]](")).toEqual({ depth: 1, unmatchedClose: false });
    });

    it("only nests character classes with the v flag", () => {
        // Without the v flag, the class ends at the first ']', so the ')' after it closes nothing.
        expect(scanRegexSource("[[a])]")).toEqual({ depth: 0, unmatchedClose: true });
        expect(scanRegexSource("[[a])]", { unicodeSets: true })).toEqual({ depth: 0, unmatchedClose: false });
    });
});

describe("scanOptionsFromFlags", () => {
    it("reads the u and v flags", () => {
        expect(scanOptionsFromFlags("gi")).toEqual({ unicode: false, unicodeSets: false });
        expect(scanOptionsFromFlags("u")).toEqual({ unicode: true, unicodeSets: false });
        expect(scanOptionsFromFlags("v")).toEqual({ unicode: true, unicodeSets: true });
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

