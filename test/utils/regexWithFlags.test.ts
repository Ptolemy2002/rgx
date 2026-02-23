import { regexWithFlags, RGXInvalidVanillaRegexFlagsError } from "src/index";

describe("regexWithFlags", () => {
    it("always returns a new regex", () => {
        const exp = /abc/;
        const newExp = regexWithFlags(exp, "i");
        expect(newExp).not.toBe(exp);
    });

    it("combines existing flags with new flags when replace is false", () => {
        const exp = /abc/g;
        const newExp = regexWithFlags(exp, "i");
        expect(newExp.flags).toBe("gi");
    });

    it("replaces existing flags when replace is true", () => {
        const exp = /abc/g;
        const newExp = regexWithFlags(exp, "i", true);
        expect(newExp.flags).toBe("i");
    });

    it("removes duplicate flags", () => {
        const exp = /abc/gi;
        const newExp = regexWithFlags(exp, "i");
        expect(newExp.flags).toBe("gi");
    });

    it("rejects invalid flags", () => {
        const exp = /abc/;
        expect(() => regexWithFlags(exp, "z")).toThrow(RGXInvalidVanillaRegexFlagsError);
    });
});