import { doesRegexMatchAfterPosition, assertRegexMatchesAfterPosition, regexMatchAfterPosition, RGXOutOfBoundsError, RGXRegexNotMatchedAfterPositionError } from "src/index";

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

describe("doesRegexMatchAfterPosition", () => {
    boundsTest((str, pos) => doesRegexMatchAfterPosition(/a/, str, pos));

    it("correctly identifies matches at or after the specified position", () => {
        expect(doesRegexMatchAfterPosition(/a/, "abc", 0)).toBe(true);
        expect(doesRegexMatchAfterPosition(/b/, "abc", 0)).toBe(true);
        expect(doesRegexMatchAfterPosition(/b/, "abc", 1)).toBe(true);
        expect(doesRegexMatchAfterPosition(/d/, "abc", 0)).toBe(false);

        expect(() => assertRegexMatchesAfterPosition(/a/, "abc", 0)).not.toThrow();
        expect(() => assertRegexMatchesAfterPosition(/b/, "abc", 0)).not.toThrow();
        expect(() => assertRegexMatchesAfterPosition(/b/, "abc", 1)).not.toThrow();
        expect(() => assertRegexMatchesAfterPosition(/d/, "abc", 0)).toThrow(RGXRegexNotMatchedAfterPositionError);
    });

    it("correctly identifies non-matches after the specified position", () => {
        expect(doesRegexMatchAfterPosition(/a/, "abc", 1)).toBe(false);
        expect(doesRegexMatchAfterPosition(/b/, "abc", 2)).toBe(false);

        expect(() => assertRegexMatchesAfterPosition(/a/, "abc", 1)).toThrow(RGXRegexNotMatchedAfterPositionError);
        expect(() => assertRegexMatchesAfterPosition(/b/, "abc", 2)).toThrow(RGXRegexNotMatchedAfterPositionError);
    });

    it("supports regexes with lookbehinds", () => {
        expect(doesRegexMatchAfterPosition(/(?<=a)b/, "ab", 0)).toBe(true);
        expect(doesRegexMatchAfterPosition(/(?<=a)b/, "ab", 1)).toBe(true);
        expect(doesRegexMatchAfterPosition(/(?<=c)b/, "ab", 0)).toBe(false);

        expect(() => assertRegexMatchesAfterPosition(/(?<=a)b/, "ab", 0)).not.toThrow();
        expect(() => assertRegexMatchesAfterPosition(/(?<=a)b/, "ab", 1)).not.toThrow();
        expect(() => assertRegexMatchesAfterPosition(/(?<=c)b/, "ab", 0)).toThrow(RGXRegexNotMatchedAfterPositionError);
    });

    it("supports regexes that already have flags", () => {
        expect(doesRegexMatchAfterPosition(/a/i, "ABC", 0)).toBe(true);
        expect(doesRegexMatchAfterPosition(/b/i, "ABC", 0)).toBe(true);
        expect(doesRegexMatchAfterPosition(/c/i, "ABC", 2)).toBe(true);

        expect(() => assertRegexMatchesAfterPosition(/a/i, "ABC", 0)).not.toThrow();
        expect(() => assertRegexMatchesAfterPosition(/b/i, "ABC", 0)).not.toThrow();
        expect(() => assertRegexMatchesAfterPosition(/c/i, "ABC", 2)).not.toThrow();
    });

    it("is a [number, RegExpExecArray] when includeMatch is true and a match is found", () => {
        const match = doesRegexMatchAfterPosition(/a/, "abc", 0, true);
        
        expect(match).toBeInstanceOf(Array);
        expect((match as [number, RegExpExecArray])[0]).toBe(0);
        expect((match as [number, RegExpExecArray])[1][0]).toBe("a");

        const assertMatch = assertRegexMatchesAfterPosition(/a/, "abc", 0, null, true);
        expect(assertMatch).toBeInstanceOf(Array);
        expect(assertMatch[0]).toBe(0);
        expect(assertMatch[1][0]).toBe("a");
    });

    it("is a [number, string] when includeMatch is false and a match is found", () => {
        const match = doesRegexMatchAfterPosition(/a/, "abc", 0, false);
        expect(match).toBe(true);
    });

    it("is false when includeMatch is true and no match is found", () => {
        const match = doesRegexMatchAfterPosition(/d/, "abc", 0, true);
        expect(match).toBe(false);
        expect(() => assertRegexMatchesAfterPosition(/d/, "abc", 0, null, true)).toThrow(RGXRegexNotMatchedAfterPositionError);
    });
});

describe("regexMatchAfterPosition", () => {
    boundsTest((str, pos) => regexMatchAfterPosition(/a/, str, pos));

    it("correctly identifies matches at or after the specified position", () => {
        expect(regexMatchAfterPosition(/a/, "abc", 0)).toEqual([0, "a"]);
        expect(regexMatchAfterPosition(/b/, "abc", 0)).toEqual([1, "b"]);
        expect(regexMatchAfterPosition(/b/, "abc", 1)).toEqual([1, "b"]);
        expect(regexMatchAfterPosition(/d/, "abc", 0)).toBe(null);
    });

    it("correctly identifies non-matches after the specified position", () => {
        expect(regexMatchAfterPosition(/a/, "abc", 1)).toBe(null);
        expect(regexMatchAfterPosition(/b/, "abc", 2)).toBe(null);
    });

    it("supports regexes with lookbehinds", () => {
        expect(regexMatchAfterPosition(/(?<=a)b/, "ab", 0)).toEqual([1, "b"]);
        expect(regexMatchAfterPosition(/(?<=a)b/, "ab", 1)).toEqual([1, "b"]);
        expect(regexMatchAfterPosition(/(?<=c)b/, "ab", 0)).toBe(null);
    });

    it("supports regexes that already have flags", () => {
        expect(regexMatchAfterPosition(/a/i, "ABC", 0)).toEqual([0, "A"]);
        expect(regexMatchAfterPosition(/b/i, "ABC", 0)).toEqual([1, "B"]);
        expect(regexMatchAfterPosition(/c/i, "ABC", 2)).toEqual([2, "C"]);
    });

    it("is a [number, RegExpExecArray] when includeMatch is true", () => {
        const match = regexMatchAfterPosition(/a/, "abc", 0, true);
        expect(match).toBeInstanceOf(Array);
        expect(match![0]).toBe(0);
        expect(match![1][0]).toBe("a");
    });
});
