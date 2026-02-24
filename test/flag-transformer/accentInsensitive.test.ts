import { accentInsensitiveFlagTransformer, registerCustomFlagTransformers, unregisterCustomFlagTransformers } from "src/flag-transformer";
import { ExtRegExp } from "src/ExtRegExp";

describe("accentInsensitiveFlagTransformer", () => {
    it("preserves the original flags", () => {
        const regex = new ExtRegExp("tést", "gi");
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed.flags).toBe(regex.flags);
    });

    it("leaves patterns without accentable characters unchanged", () => {
        const regex = new ExtRegExp("tst", "g");
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed.source).toBe(regex.source);
    });

    it("transforms patterns with one accentable character correctly", () => {
        const regex = new ExtRegExp("tést", "g");
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed.source).toBe("t(e|é|è|ë|ê)st");
    });

    it("transforms patterns with multiple accentable characters correctly", () => {
        const regex = new ExtRegExp("tésting", "g");
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed.source).toBe("t(e|é|è|ë|ê)st(i|í|ì|ï|î)ng");
    });

    it("works with uppercase characters", () => {
        const regex = new ExtRegExp("TÉST", "g");
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed.source).toBe("T(E|É|È|Ë|Ê)ST");
    });

    it("works when applied as a flag", () => {
        registerCustomFlagTransformers(); // Ensure the "a" flag is registered
        const regex = new ExtRegExp("tést", "ga");
        expect(regex.source).toBe("t(e|é|è|ë|ê)st");
        unregisterCustomFlagTransformers(); // Clean up after the test
    });
});