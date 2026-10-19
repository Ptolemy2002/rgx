import { accentInsensitiveFlagTransformer, registerCustomFlagTransformers, unregisterCustomFlagTransformers } from "src/flag-transformer";
import { ExtRegExp } from "src/ExtRegExp";

describe("accentInsensitiveFlagTransformer", () => {
    it("preserves the original flags", () => {
        const regex = new ExtRegExp("tést", "gi");
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed[1]).toBe(regex.flags);
    });

    it("leaves patterns without accentable characters unchanged", () => {
        const regex = new ExtRegExp("tst", "g");
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed[0]).toBe(regex.source);
    });

    it("transforms patterns with one accentable character correctly", () => {
        const regex = new ExtRegExp("tést", "g");
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed[0]).toBe("t[eéèëê]st");
    });

    it("transforms patterns with multiple accentable characters correctly", () => {
        const regex = new ExtRegExp("tésting", "g");
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed[0]).toBe("t[eéèëê]st[iíìïî]ng");
    });

    it("works with uppercase characters", () => {
        const regex = new ExtRegExp("TÉST", "g");
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed[0]).toBe("T[EÉÈËÊ]ST");
    });

    it("does not transform escaped characters", () => {
        const regex = new ExtRegExp("\\u0025", "g"); // The u is escaped, so it should not be transformed
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed[0]).toBe("\\u0025");
    });

    it("does not transform characters part of a localized flag pattern", () => {
        const regex = new ExtRegExp("(?mi:y)tst", "g"); // The i is part of a localized flag pattern, so it should not be transformed
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed[0]).toBe("(?mi:y)tst");
    });

    it("does not transform characters part of a localized flag pattern with a dash", () => {
        const regex = new ExtRegExp("(?m-i:y)tst", "g"); // The i is part of a localized flag pattern, so it should not be transformed
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed[0]).toBe("(?m-i:y)tst");
    });

    it("does not transform characters part of a character class", () => {
        const regex = new ExtRegExp("[0-9a-z]", "g"); // Characters inside a character class should not be transformed
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed[0]).toBe("[0-9a-z]");
    });

    it("does transform characters following a character class", () => {
        const regex = new ExtRegExp("[0-9a-z]tést", "g"); // Characters after a character class should be transformed
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed[0]).toBe("[0-9a-z]t[eéèëê]st");
    });

    it("does not transform escapes that produce accentable characters", () => {
        const regex = new ExtRegExp("\\x61\\u00e9", "g");
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed[0]).toBe("\\x61\\u00e9");
    });

    it("does not transform characters part of group names or named backreferences", () => {
        const regex = new ExtRegExp("(?<value>x)\\k<value>", "g");
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed[0]).toBe("(?<value>x)\\k<value>");
    });

    it("does not transform characters part of property escapes", () => {
        const regex = new ExtRegExp("\\p{Script=Latin}", "gu");
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed[0]).toBe("\\p{Script=Latin}");
    });

    it("does not transform characters part of nested character classes or class strings", () => {
        const regex = new ExtRegExp("[[a-e]--[\\q{ou}]]", "gv");
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed[0]).toBe("[[a-e]--[\\q{ou}]]");
    });

    it("transforms quantified characters so the quantifier applies to the whole replacement", () => {
        const regex = new ExtRegExp("ó+", "g");
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed[0]).toBe("[oóòöôõ]+");
        expect(new RegExp(transformed[0], transformed[1]).exec("xoóö")?.[0]).toBe("oóö");
    });

    it("transforms characters inside groups and lookarounds", () => {
        const regex = new ExtRegExp("(?<n>a)(?<=u)", "g");
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed[0]).toBe("(?<n>[aáàäâã])(?<=[uúùüû])");
    });

    it("matches every accented variant of the transformed characters", () => {
        const [source, flags] = accentInsensitiveFlagTransformer(new ExtRegExp("^tést$"));
        const regex = new RegExp(source, flags);
        for (const variant of ["test", "tést", "tèst", "tëst", "têst"]) expect(regex.test(variant)).toBe(true);
        expect(regex.test("tast")).toBe(false);
    });

    it("works when applied as a flag", () => {
        registerCustomFlagTransformers(); // Ensure the "a" flag is registered
        const regex = new ExtRegExp("tést", "ga");
        expect(regex.source).toBe("t[eéèëê]st");
        unregisterCustomFlagTransformers(); // Clean up after the test
    });
});