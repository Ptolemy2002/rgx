import { beginningFlagTransformer, registerCustomFlagTransformers, unregisterCustomFlagTransformers } from "src/flag-transformer";
import { ExtRegExp } from "src/ExtRegExp";

describe("beginningFlagTransformer", () => {
    it("preserves the original flags", () => {
        const regex = new ExtRegExp("test", "gi");
        const transformed = beginningFlagTransformer(regex);
        expect(transformed[1]).toBe(regex.flags);
    });

    it("creates patterns that begin with ^", () => {
        const regex = new ExtRegExp("test", "g");
        const transformed = beginningFlagTransformer(regex);
        expect(transformed[0].startsWith("^")).toBe(true);
    });


    it("wraps the original pattern in a non-capturing group", () => {
        const regex = new ExtRegExp("a|b", "g");
        const transformed = beginningFlagTransformer(regex);
        expect(transformed[0]).toBe("^(?:a|b)");
    });

    it("works when applied as a flag", () => {
        registerCustomFlagTransformers(); // Ensure the "b" flag is registered
        const regex = new ExtRegExp("test", "gb");
        expect(regex.source).toBe("^(?:test)");
        unregisterCustomFlagTransformers(); // Clean up after the test
    });
});