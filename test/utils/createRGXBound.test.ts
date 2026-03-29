import { ExtRegExp } from "src/ExtRegExp";
import { rgxa } from "src/index";
import { isRGXConvertibleToken } from "src/typeGuards";
import { createRGXBounds } from "src/utils";

describe("createRGXBounds", () => {
    it("returns an array of two RGXConvertibleTokens", () => {
        const result = createRGXBounds("a", "b");
        expect(result).toHaveLength(2);
        
        const [startBound, endBound] = result;
        
        expect(isRGXConvertibleToken(startBound)).toBe(true);
        expect(isRGXConvertibleToken(endBound)).toBe(true);
    });

    it("wraps the bounds in a lookahead/lookbehind structure when both anchorStart and anchorEnd are true", () => {
        const [startBound, endBound] = createRGXBounds("a", "b", {anchorStart: true, anchorEnd: true});

        expect((startBound.toRgx() as ExtRegExp).source).toBe("(?<=b|^)(?=a)");
        expect((endBound.toRgx() as ExtRegExp).source).toBe("(?<=a)(?=b|$)");
    });

    it("wraps the bounds in a lookahead/lookbehind structure when both anchorStart and anchorEnd are false", () => {
        const [startBound, endBound] = createRGXBounds("a", "b", {anchorStart: false, anchorEnd: false});

        expect((startBound.toRgx() as ExtRegExp).source).toBe("(?<=b)(?=a)");
        expect((endBound.toRgx() as ExtRegExp).source).toBe("(?<=a)(?=b)");
    });

    it("accepts flags for the regex", () => {
        const [startBound, endBound] = createRGXBounds("a", "b", {flags: "i"});

        expect((startBound.toRgx() as ExtRegExp).flags).toBe("i");
        expect((endBound.toRgx() as ExtRegExp).flags).toBe("i");
    });

    it("accepts a string instead of an options object as flags", () => {
        const [startBound, endBound] = createRGXBounds("a", "b", "i");

        expect((startBound.toRgx() as ExtRegExp).flags).toBe("i");
        expect((endBound.toRgx() as ExtRegExp).flags).toBe("i");
    });

    it("correctly sets the convertible token options of the bounds when passed non-convertible tokens", () => {
        const [startBound, endBound] = createRGXBounds("a", "b", {flags: "i"});

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

        const [startBound, endBound] = createRGXBounds(positive, negative, {flags: "i"});
        
        expect(startBound.rgxGroupWrap).toBe(false);
        expect(startBound.rgxIsGroup).toBe(false);
        expect(startBound.rgxIsRepeatable).toBe(false);

        expect(endBound.rgxGroupWrap).toBe(false);
        expect(endBound.rgxIsGroup).toBe(false);
        expect(endBound.rgxIsRepeatable).toBe(false);
    });

    it("creates a startBound that only matches positions preceded by the negative token and followed by the positive token when both anchorStart and anchorEnd are false", () => {
        const [startBound] = createRGXBounds("a", "b", {anchorStart: false, anchorEnd: false});
        const regex = rgxa([startBound]);
        
        expect(regex.test("ba")).toBe(true); // The match is between "b" and "a"
        expect(regex.test("ab")).toBe(false); // This doesn't match since we don't include the start of the string
    });

    it("creates an endBound that only matches positions preceded by the positive token and followed by the negative token when both anchorStart and anchorEnd are false", () => {
        const [, endBound] = createRGXBounds("a", "b", {anchorStart: false, anchorEnd: false});
        const regex = rgxa([endBound]);

        expect(regex.test("ab")).toBe(true); // The match is between "a" and "b"
        expect(regex.test("ba")).toBe(false); // This doesn't match since we don't include the end of the string
    });

    it("creates a startBound that also matches the start of the string when anchorStart is true", () => {
        const [startBound] = createRGXBounds("a", "b", {anchorStart: true, anchorEnd: false});
        const regex = rgxa([startBound]);

        expect(regex.test("a")).toBe(true); // The match is at the start of the string
    });

    it("creates an endBound that also matches the end of the string when anchorEnd is true", () => {
        const [, endBound] = createRGXBounds("a", "b", {anchorStart: false, anchorEnd: true});
        const regex = rgxa([endBound]);

        expect(regex.test("a")).toBe(true); // The match is at the end of the string
    });
});