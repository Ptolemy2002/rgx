import { regexMatchAtPosition, RGXOutOfBoundsError } from "src/index";

describe("regexMatchAtPosition", () => {
    it("rejects out of bounds positions", () => {
        expect(() => regexMatchAtPosition(/a/, "abc", -1)).toThrow(RGXOutOfBoundsError);
        expect(() => regexMatchAtPosition(/a/, "abc", 3)).toThrow(RGXOutOfBoundsError);
    });

    it("accepts in-bounds positions", () => {
        expect(() => regexMatchAtPosition(/a/, "abc", 0)).not.toThrow();
        expect(() => regexMatchAtPosition(/a/, "abc", 1)).not.toThrow();
        expect(() => regexMatchAtPosition(/a/, "abc", 2)).not.toThrow();
    });

    it("correctly identifies matches at the specified position", () => {
        expect(regexMatchAtPosition(/a/, "abc", 0)).toBe(true);
        expect(regexMatchAtPosition(/b/, "abc", 1)).toBe(true);
        expect(regexMatchAtPosition(/c/, "abc", 2)).toBe(true);
        expect(regexMatchAtPosition(/d/, "abc", 0)).toBe(false);
    });

    it("correctly identifies non-matches at the specified position", () => {
        expect(regexMatchAtPosition(/a/, "abc", 1)).toBe(false);
        expect(regexMatchAtPosition(/b/, "abc", 2)).toBe(false);
        expect(regexMatchAtPosition(/c/, "abc", 0)).toBe(false);
    });

    it("supports regexes with lookbehinds", () => {
        expect(regexMatchAtPosition(/(?<=a)b/, "ab", 1)).toBe(true);
        expect(regexMatchAtPosition(/(?<=c)b/, "ab", 1)).toBe(false);
        expect(regexMatchAtPosition(/(?<=a)b/, "ab", 0)).toBe(false);
    });

    it("supports regexes that already have flags", () => {
        expect(regexMatchAtPosition(/a/i, "ABC", 0)).toBe(true);
        expect(regexMatchAtPosition(/b/i, "ABC", 1)).toBe(true);
        expect(regexMatchAtPosition(/c/i, "ABC", 2)).toBe(true);
    });
});