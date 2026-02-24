import { registerCustomFlagTransformers, unregisterCustomFlagTransformers } from "src/flag-transformer";
import { isFlagKeyAvailable } from "src/ExtRegExp";

describe("registerCustomFlagTransformers", () => {
    it("registers the a flag", () => {
        registerCustomFlagTransformers();
        expect(isFlagKeyAvailable("a")).toBe(false);
        unregisterCustomFlagTransformers();
    });
});

describe("unregisterCustomFlagTransformers", () => {
    it("unregisters the a flag", () => {
        registerCustomFlagTransformers();
        unregisterCustomFlagTransformers();
        expect(isFlagKeyAvailable("a")).toBe(true);
    });
});