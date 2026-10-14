import {
    isRGXToken, assertRGXToken, isRGXConvertibleToken, rgxConstant, rgxRepeat, rgxInterpolation,
    RGXClassToken, RGXRepeatToken, RGXLookaheadToken, RGXInvalidTokenError, RGXNotSupportedError
} from "src/index";

class ZeroWidthClassToken extends RGXClassToken {
    toRgx() {
        return /^/;
    }

    clone() {
        return new ZeroWidthClassToken();
    }
}

class RepeatableZeroWidthClassToken extends ZeroWidthClassToken {
    get rgxIsRepeatable() {
        return true;
    }
}

describe("rgxIsRepeatable detection", () => {
    let warn: jest.SpyInstance;

    beforeEach(() => {
        warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        warn.mockRestore();
    });

    it("accepts convertible tokens with rgxIsRepeatable set to undefined", () => {
        expect(isRGXConvertibleToken({ toRgx: () => "a", rgxIsRepeatable: undefined })).toBe(true);
    });

    it("treats convertible tokens without rgxIsRepeatable that consume no characters as non-repeatable", () => {
        for (const token of [{ toRgx: () => /^/ }, { toRgx: () => /(?<=a)(?=b)/ }, { toRgx: () => [/^/, /$/] }, new ZeroWidthClassToken()]) {
            expect(isRGXToken(token, "repeatable")).toBe(false);
            expect(() => assertRGXToken(token, "repeatable")).toThrow(RGXInvalidTokenError);
            expect(() => new RGXRepeatToken(token)).toThrow(RGXNotSupportedError);
        }
    });

    it("treats convertible tokens without rgxIsRepeatable that might consume characters as repeatable", () => {
        for (const token of [{ toRgx: () => /a?/ }, { toRgx: () => /^a/ }, { toRgx: () => "" }, { toRgx: () => null }]) {
            expect(isRGXToken(token, "repeatable")).toBe(true);
        }
    });

    it("treats convertible tokens that can't be resolved on their own as repeatable", () => {
        expect(isRGXToken({ toRgx: () => rgxInterpolation("(") }, "repeatable")).toBe(true);
    });

    it("trusts an explicit rgxIsRepeatable", () => {
        expect(isRGXToken({ toRgx: () => "a", rgxIsRepeatable: false }, "repeatable")).toBe(false);
        expect(isRGXToken({ toRgx: () => /^/, rgxIsRepeatable: true }, "repeatable")).toBe(true);
    });

    it("does not detect literal tokens, which are always repeatable", () => {
        expect(isRGXToken(/^/, "repeatable")).toBe(true);
        expect(() => new RGXRepeatToken(/^/)).not.toThrow();
    });

    it("detects the built-in zero-width tokens as non-repeatable", () => {
        for (const name of ["start", "line-start", "end", "line-end", "word-bound", "non-word-bound", "word-bound-start", "word-bound-end", "escape-bound", "non-escape-bound", "never"]) {
            expect(isRGXToken(rgxConstant(name), "repeatable")).toBe(false);
            expect(() => rgxConstant(name).repeat()).toThrow(RGXNotSupportedError);
        }

        expect(() => new RGXLookaheadToken(["a"]).optional()).toThrow(RGXNotSupportedError);
        expect(() => rgxConstant("digit").repeat()).not.toThrow();
    });

    it("allows repeating zero-width tokens explicitly marked as repeatable, warning once per token", () => {
        const token = { toRgx: () => /^/, rgxIsRepeatable: true };
        expect((rgxRepeat(token, 0, null).toRgx() as RegExp).source).toBe("(?:^)*");
        rgxRepeat(token, 2);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain("convertible token");

        rgxRepeat({ toRgx: () => /$/, rgxIsRepeatable: true });
        expect(warn).toHaveBeenCalledTimes(2);

        const classToken = new RepeatableZeroWidthClassToken();
        classToken.repeat();
        classToken.optional();
        expect(warn).toHaveBeenCalledTimes(3);
        expect(warn.mock.calls[2][0]).toContain("RepeatableZeroWidthClassToken token");
    });

    it("warns about JSON class tokens that convert to zero-width tokens marked as repeatable", () => {
        const json = { $rgx: true as const, class: "RGXClassWrapperToken", args: [{ $rgx: true as const, source: "^" }] };
        // The wrapped literal is detected as zero-width, so the wrapper is not repeatable.
        expect(() => new RGXRepeatToken(json)).toThrow(RGXNotSupportedError);
        expect(warn).not.toHaveBeenCalled();
    });

    it("does not warn about tokens that consume characters or are not explicitly marked", () => {
        rgxRepeat({ toRgx: () => "a", rgxIsRepeatable: true });
        rgxRepeat({ toRgx: () => "a" });
        rgxRepeat("a");
        rgxRepeat({ $rgx: true, class: "RGXSubpatternToken", args: [1] });
        expect(warn).not.toHaveBeenCalled();
    });
});
