import { isConstructor } from "src/internal/isConstructor";
import { getProxy } from "src/internal/getProxy";

jest.mock("src/internal/getProxy", () => ({
    getProxy: jest.fn(() => Proxy)
}));

describe("isConstructor", () => {
    describe("with Proxy support", () => {
        it("accepts constructor objects", () => {
            class Test {}
            function TestFunc() {}

            expect(isConstructor(Test)).toBe(true);
            expect(isConstructor(TestFunc)).toBe(true);
        });

        it("rejects non-constructor objects", () => {
            expect(isConstructor({})).toBe(false);
            expect(isConstructor(() => {})).toBe(false);
            expect(isConstructor(null)).toBe(false);
            expect(isConstructor(undefined)).toBe(false);
        });
    });

    describe("without Proxy support", () => {
        beforeAll(() => {
            (getProxy as jest.Mock).mockReturnValue(undefined);
        });

        it("logs a warning and returns false", () => {
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

            expect(isConstructor(class {})).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith("rgx: Proxy is not supported. Constructor detection will not work properly.");

            consoleSpy.mockRestore();
        });

        it("does not log the warning multiple times", () => {
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

            expect(isConstructor(class {})).toBe(false);
            // Since the tracker is a variable, the previous test should have set it to true
            // so this call should not log the warning again.
            expect(consoleSpy).toHaveBeenCalledTimes(0);

            consoleSpy.mockRestore();
        });

        afterAll(() => {
            (getProxy as jest.Mock).mockReturnValue(Proxy);
        });
    });
});