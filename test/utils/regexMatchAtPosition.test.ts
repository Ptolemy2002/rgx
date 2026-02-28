import { doesRegexMatchAtPosition, assertRegexMatchesAtPosition, regexMatchAtPosition, RGXOutOfBoundsError, RGXRegexNotMatchedAtPositionError } from "src/index";

function boundsTest(fn: (str: string, pos: number) => void) {
    it("rejects out of bounds positions", () => {
        expect(() => fn("abc", -1)).toThrow(RGXOutOfBoundsError);
        expect(() => fn("abc", 3)).toThrow(RGXOutOfBoundsError);
    });

    it("accepts in-bounds positions", () => {
        expect(() => fn("abc", 0)).not.toThrow();
        expect(() => fn("abc", 1)).not.toThrow();
        expect(() => fn("abc", 2)).not.toThrow();
    });
}

describe("doesRegexMatchAtPosition", () => {
    boundsTest((str, pos) => doesRegexMatchAtPosition(/a/, str, pos));

    it("correctly identifies matches at the specified position", () => {
        expect(doesRegexMatchAtPosition(/a/, "abc", 0)).toBe(true);
        expect(doesRegexMatchAtPosition(/b/, "abc", 1)).toBe(true);
        expect(doesRegexMatchAtPosition(/c/, "abc", 2)).toBe(true);
        expect(doesRegexMatchAtPosition(/d/, "abc", 0)).toBe(false);

        expect(() => assertRegexMatchesAtPosition(/a/, "abc", 0)).not.toThrow();
        expect(() => assertRegexMatchesAtPosition(/b/, "abc", 1)).not.toThrow();
        expect(() => assertRegexMatchesAtPosition(/c/, "abc", 2)).not.toThrow();
        expect(() => assertRegexMatchesAtPosition(/d/, "abc", 0)).toThrow(RGXRegexNotMatchedAtPositionError);
    });

    it("correctly identifies non-matches at the specified position", () => {
        expect(doesRegexMatchAtPosition(/a/, "abc", 1)).toBe(false);
        expect(doesRegexMatchAtPosition(/b/, "abc", 2)).toBe(false);
        expect(doesRegexMatchAtPosition(/c/, "abc", 0)).toBe(false);

        expect(() => assertRegexMatchesAtPosition(/a/, "abc", 1)).toThrow(RGXRegexNotMatchedAtPositionError);
        expect(() => assertRegexMatchesAtPosition(/b/, "abc", 2)).toThrow(RGXRegexNotMatchedAtPositionError);
        expect(() => assertRegexMatchesAtPosition(/c/, "abc", 0)).toThrow(RGXRegexNotMatchedAtPositionError);
    });

    it("supports regexes with lookbehinds", () => {
        expect(doesRegexMatchAtPosition(/(?<=a)b/, "ab", 1)).toBe(true);
        expect(doesRegexMatchAtPosition(/(?<=c)b/, "ab", 1)).toBe(false);
        expect(doesRegexMatchAtPosition(/(?<=a)b/, "ab", 0)).toBe(false);

        expect(() => assertRegexMatchesAtPosition(/(?<=a)b/, "ab", 1)).not.toThrow();
        expect(() => assertRegexMatchesAtPosition(/(?<=c)b/, "ab", 1)).toThrow(RGXRegexNotMatchedAtPositionError);
        expect(() => assertRegexMatchesAtPosition(/(?<=a)b/, "ab", 0)).toThrow(RGXRegexNotMatchedAtPositionError);
    });

    it("supports regexes that already have flags", () => {
        expect(doesRegexMatchAtPosition(/a/i, "ABC", 0)).toBe(true);
        expect(doesRegexMatchAtPosition(/b/i, "ABC", 1)).toBe(true);
        expect(doesRegexMatchAtPosition(/c/i, "ABC", 2)).toBe(true);

        expect(() => assertRegexMatchesAtPosition(/a/i, "ABC", 0)).not.toThrow();
        expect(() => assertRegexMatchesAtPosition(/b/i, "ABC", 1)).not.toThrow();
        expect(() => assertRegexMatchesAtPosition(/c/i, "ABC", 2)).not.toThrow();
    });
});

describe("regexMatchAtPosition", () => {
    boundsTest((str, pos) => regexMatchAtPosition(/a/, str, pos));

    it("correctly identifies matches at the specified position", () => {
        expect(regexMatchAtPosition(/a/, "abc", 0)).toBe("a");
        expect(regexMatchAtPosition(/b/, "abc", 1)).toBe("b");
        expect(regexMatchAtPosition(/c/, "abc", 2)).toBe("c");
        expect(regexMatchAtPosition(/d/, "abc", 0)).toBe(null);
    });

    it("correctly identifies non-matches at the specified position", () => {
        expect(regexMatchAtPosition(/a/, "abc", 1)).toBe(null);
        expect(regexMatchAtPosition(/b/, "abc", 2)).toBe(null);
        expect(regexMatchAtPosition(/c/, "abc", 0)).toBe(null);
    });

    it("supports regexes with lookbehinds", () => {
        expect(regexMatchAtPosition(/(?<=a)b/, "ab", 1)).toBe("b");
        expect(regexMatchAtPosition(/(?<=c)b/, "ab", 1)).toBe(null);
        expect(regexMatchAtPosition(/(?<=a)b/, "ab", 0)).toBe(null);
    });

    it("supports regexes that already have flags", () => {
        expect(regexMatchAtPosition(/a/i, "ABC", 0)).toBe("A");
        expect(regexMatchAtPosition(/b/i, "ABC", 1)).toBe("B");
        expect(regexMatchAtPosition(/c/i, "ABC", 2)).toBe("C");
    });
});