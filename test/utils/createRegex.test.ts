import { ExtRegExp, registerFlagTransformer, unregisterFlagTransformer } from "src/ExtRegExp";
import { createRegex } from "src/utils";
import { RGXInvalidVanillaRegexFlagsError, RGXInvalidRegexFlagsError, RGXInvalidRegexStringError } from "src/errors";
import { expectError } from "../utils";

class UnexpectedError extends Error {}

function expectRegexInstance(value: unknown, extended: boolean) {
    if (extended) {
        expect(value).toBeInstanceOf(ExtRegExp);
    } else {
        expect(value).toBeInstanceOf(RegExp);
        expect(value).not.toBeInstanceOf(ExtRegExp);
    }
}

describe("createRegex", () => {
    it("creates a RexExp instance when only a pattern is passed", () => {
        const regex = createRegex("abc");
        expectRegexInstance(regex, false);
    });

    it("creates a RegExp instance when only a pattern and flags are passed", () => {
        const regex = createRegex("abc", "gi");
        expectRegexInstance(regex, false);
    });

    it("creates a RegExp instance when extended is false", () => {
        const regex = createRegex("abc", "gi", false);
        expectRegexInstance(regex, false);
    });

    it("creates an ExtRegExp instance when extended is true", () => {
        const regex = createRegex("abc", "gi", true);
        expectRegexInstance(regex, true);
    });

    it("throws an RGXInvalidRegexStringError when an invalid regex pattern is passed, regardless of the value of extended", () => {
        expect(() => createRegex("abc(", "g", false)).toThrow(RGXInvalidRegexStringError);
        expect(() => createRegex("abc(", "g", true)).toThrow(RGXInvalidRegexStringError);
    });

    it("throws an RGXInvalidVanillaRegexFlagsError when invalid flags are passed and extended is false", () => {
        expect(() => createRegex("abc", "invalid", false)).toThrow(RGXInvalidVanillaRegexFlagsError);
    });

    it("throws an RGXInvalidRegexFlagsError when invalid flags are passed and extended is true", () => {
        expect(() => createRegex("abc", "invalid", true)).toThrow(RGXInvalidRegexFlagsError);
    });

    it("does not accept a custom registered flag when extended is false", () => {
        registerFlagTransformer("x", (r) => [r.source, r.flags]);
        expect(() => createRegex("abc", "x", false)).toThrow(RGXInvalidVanillaRegexFlagsError);
        unregisterFlagTransformer("x");
    });

    it("accepts a custom registered flag when extended is true", () => {
        registerFlagTransformer("x", (r) => [r.source, r.flags]);
        expect(() => createRegex("abc", "x", true)).not.toThrow();
        unregisterFlagTransformer("x");
    });

    it("throws an RGXInvalidRegexStringError when a transformer makes a pattern invalid", () => {
        registerFlagTransformer("x", (r) => [r.source + "(", r.flags]);
        expect(() => createRegex("abc", "x", true)).toThrow(RGXInvalidRegexStringError);
        unregisterFlagTransformer("x");
    });

    it("rethrows the error when a flag transformer throws an unexpected error", () => {
        const e = new UnexpectedError("Unexpected Error");
        registerFlagTransformer("x", () => { throw e; });
        expectError(() => createRegex("abc", "x", true), UnexpectedError, (err) => {
            expect(err).toBe(e);
        });
    });
});
