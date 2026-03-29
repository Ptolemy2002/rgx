import { ExtRegExp } from "src/ExtRegExp";
import { rgxa } from "src/index";
import { isRGXConvertibleToken } from "src/typeGuards";
import { createRGXBounds, doesRegexMatchAfterPosition } from "src/utils";

describe("createRGXBounds", () => {
    it("returns an array of two RGXConvertibleTokens", () => {
        const result = createRGXBounds("a", "b");
        expect(result).toHaveLength(2);
        
        const [startBound, endBound] = result;
        
        expect(isRGXConvertibleToken(startBound)).toBe(true);
        expect(isRGXConvertibleToken(endBound)).toBe(true);
    });

    it("wraps the bounds in a lookahead/lookbehind structure", () => {
        const [startBound, endBound] = createRGXBounds("a", "b");

        expect((startBound.toRgx() as ExtRegExp).source).toBe("(?<=a)(?=b)");
        expect((endBound.toRgx() as ExtRegExp).source).toBe("(?<=b)(?=a)");
    });

    it("accepts flags for the regex", () => {
        const [startBound, endBound] = createRGXBounds("a", "b", "i");

        expect((startBound.toRgx() as ExtRegExp).flags).toBe("i");
        expect((endBound.toRgx() as ExtRegExp).flags).toBe("i");
    });

    it("correctly sets the convertible token options of the bounds when passed non-convertible tokens", () => {
        const [startBound, endBound] = createRGXBounds("a", "b", "i");

        expect(startBound.rgxGroupWrap).toBe(false);
        expect(startBound.rgxIsGroup).toBe(false);
        expect(startBound.rgxIsRepeatable).toBe(false);

        expect(endBound.rgxGroupWrap).toBe(false);
        expect(endBound.rgxIsGroup).toBe(false);
        expect(endBound.rgxIsRepeatable).toBe(false);
    });

    it("correctly sets the convertible token options of the bounds when passed convertible tokens", () => {
        const before = { toRgx() { return "a"; }, rgxGroupWrap: true, rgxIsGroup: true, rgxIsRepeatable: true };
        const after = { toRgx() { return "b"; }, rgxGroupWrap: true, rgxIsGroup: true, rgxIsRepeatable: true };

        const [startBound, endBound] = createRGXBounds(before, after, "i");
        
        expect(startBound.rgxGroupWrap).toBe(false);
        expect(startBound.rgxIsGroup).toBe(false);
        expect(startBound.rgxIsRepeatable).toBe(false);

        expect(endBound.rgxGroupWrap).toBe(false);
        expect(endBound.rgxIsGroup).toBe(false);
        expect(endBound.rgxIsRepeatable).toBe(false);
    });

    it("creates a startBound that only matches positions preceded by the before token and followed by the after token", () => {
        const [startBound] = createRGXBounds("a", "b");
        const regex = rgxa([startBound, "b"]);
        
        expect(doesRegexMatchAfterPosition(regex, "ab", 0)).toBe(true);
        expect(doesRegexMatchAfterPosition(regex, "ba", 0)).toBe(false);
    });

    it("creates an endBound that only matches positions preceded by the after token and followed by the before token", () => {
        const [, endBound] = createRGXBounds("a", "b");
        const regex = rgxa([endBound, "a"]);

        expect(doesRegexMatchAfterPosition(regex, "ab", 0)).toBe(false);
        expect(doesRegexMatchAfterPosition(regex, "ba", 0)).toBe(true);
    });
});