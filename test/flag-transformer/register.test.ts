import { registerCustomFlagTransformers, unregisterCustomFlagTransformers } from "src/flag-transformer";
import { isFlagKeyAvailable } from "src/ExtRegExp";

function testRegister(flag: string) {
    registerCustomFlagTransformers();
    expect(isFlagKeyAvailable(flag)).toBe(false);
    unregisterCustomFlagTransformers();
}

function testUnregister(flag: string) {
    registerCustomFlagTransformers();
    unregisterCustomFlagTransformers();
    expect(isFlagKeyAvailable(flag)).toBe(true);
}

describe("registerCustomFlagTransformers", () => {
    it("registers the a flag", () => {
        testRegister("a");
    });

    it("registers the w flag", () => {
        testRegister("w");
    });

    it("registers the b flag", () => {
        testRegister("b");
    });

    it("registers the e flag", () => {
        testRegister("e");
    });
});

describe("unregisterCustomFlagTransformers", () => {
    it("unregisters the a flag", () => {
        testUnregister("a");
    });

    it("unregisters the w flag", () => {
        testUnregister("w");
    });

    it("unregisters the b flag", () => {
        testUnregister("b");
    });

    it("unregisters the e flag", () => {
        testUnregister("e");
    });
});