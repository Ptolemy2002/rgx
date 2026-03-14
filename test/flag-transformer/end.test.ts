import { endFlagTransformer, registerCustomFlagTransformers, unregisterCustomFlagTransformers } from "src/flag-transformer";
import { ExtRegExp } from "src/ExtRegExp";

describe("endFlagTransformer", () => {
    it("preserves the original flags", () => {
        const regex = new ExtRegExp("test", "gi");
        const transformed = endFlagTransformer(regex);
        expect(transformed[1]).toBe(regex.flags);
    });

    it("creates patterns that end with $", () => {
        const regex = new ExtRegExp("test", "g");
        const transformed = endFlagTransformer(regex);
        expect(transformed[0].endsWith("$")).toBe(true);
    });

    it("wraps the original pattern in a non-capturing group", () => {
        const regex = new ExtRegExp("a|b", "g");
        const transformed = endFlagTransformer(regex);
        expect(transformed[0]).toBe("(?:a|b)$");
    });

    it("works when applied as a flag", () => {
        registerCustomFlagTransformers(); // Ensure the "e" flag is registered
        const regex = new ExtRegExp("test", "ge");
        expect(regex.source).toBe("(?:test)$");
        unregisterCustomFlagTransformers(); // Clean up after the test
    });
});