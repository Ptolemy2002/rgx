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

        expect((startBound.toRgx() as ExtRegExp).source).toBe("(?<=b)(?=a)");
        expect((endBound.toRgx() as ExtRegExp).source).toBe("(?<=a)(?=b)");
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
        const positive = { toRgx() { return "a"; }, rgxGroupWrap: true, rgxIsGroup: true, rgxIsRepeatable: true };
        const negative = { toRgx() { return "b"; }, rgxGroupWrap: true, rgxIsGroup: true, rgxIsRepeatable: true };

        const [startBound, endBound] = createRGXBounds(positive, negative, "i");
        
        expect(startBound.rgxGroupWrap).toBe(false);
        expect(startBound.rgxIsGroup).toBe(false);
        expect(startBound.rgxIsRepeatable).toBe(false);

        expect(endBound.rgxGroupWrap).toBe(false);
        expect(endBound.rgxIsGroup).toBe(false);
        expect(endBound.rgxIsRepeatable).toBe(false);
    });

    it("creates a startBound that only matches positions preceded by the negative token and followed by the positive token", () => {
        const [startBound] = createRGXBounds("a", "b");
        const regex = rgxa([startBound, "a"]);
        
        expect(doesRegexMatchAfterPosition(regex, "aab", 1)).toBe(false);
        expect(doesRegexMatchAfterPosition(regex, "aba", 1)).toBe(true);
    });

    it("creates an endBound that only matches positions preceded by the positive token and followed by the negative token", () => {
        const [, endBound] = createRGXBounds("a", "b");
        const regex = rgxa([endBound, "b"]);

        expect(doesRegexMatchAfterPosition(regex, "baa", 1)).toBe(false);
        expect(doesRegexMatchAfterPosition(regex, "aab", 1)).toBe(true);
    });
});