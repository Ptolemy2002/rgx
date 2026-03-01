import { RGXClassToken } from "src/class";
import { RGXInvalidTokenError } from "src/errors";
import { rgxPart, RGXPart, RGXWalker } from "src/walker";
import { RGXPartValidationFailedError } from "src/errors";
import { expectError } from "../utils";

export class TestClassToken1 extends RGXClassToken {
    toRgx() {
        return "test";
    }

    clone() {
        return new TestClassToken1();
    }
}

class TestClassToken2 extends RGXClassToken {
    get rgxIsGroup() {
        return true as const;
    }

    get rgxIsRepeatable() {
        return false as const;
    }

    toRgx() {
        return "test";
    }

    clone() {
        return new TestClassToken2();
    }
}

function constructorTest<R, T=string>(constructor: typeof rgxPart<R, T>) {
    it("constructs an instance of RGXPart", () => {
        const instance = constructor("test");
        expect(instance).toBeInstanceOf(RGXPart);
    });

    it("correctly initializes with a token", () => {
        const token = "test";
        const instance = constructor(token);
        expect(instance.token).toBe(token);
    });

    it("correctly initializes with options", () => {
        const token = "test";
        const transform = jest.fn();
        const beforeCapture = jest.fn();
        const afterCapture = jest.fn();

        const instance = constructor(token, { transform, beforeCapture, afterCapture });
        expect(instance.transform).toBe(transform);
        expect(instance.beforeCapture).toBe(beforeCapture);
        expect(instance.afterCapture).toBe(afterCapture);
    });
}

export const isRGXPart = RGXPart.check;
export const assertRGXPart = RGXPart.assert;
describe("RGXPart", () => {
    describe("constructor", () => {
        constructorTest((...args) => new RGXPart(...args));
    });

    describe("construct function", () => {
        constructorTest(rgxPart);
    });

    describe("type guards", () => {
        it("accepts instances of RGXPart", () => {
            const instance = new RGXPart("test");
            expect(isRGXPart(instance)).toBe(true);
            expect(() => assertRGXPart(instance)).not.toThrow();
        });

        it("rejects non-instances of RGXPart", () => {
            const instance = new TestClassToken1();

            expect(isRGXPart({})).toBe(false);
            expect(isRGXPart("test")).toBe(false);
            expect(isRGXPart(123)).toBe(false);
            expect(isRGXPart(null)).toBe(false);
            expect(isRGXPart(undefined)).toBe(false);
            expect(isRGXPart(instance)).toBe(false);

            expect(() => assertRGXPart({})).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXPart("test")).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXPart(123)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXPart(null)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXPart(undefined)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXPart(instance)).toThrow(RGXInvalidTokenError);
        });
    });

    describe("rgxIsGroup", () => {
        it("is true for array tokens", () => {
            const instance = new RGXPart(["a", "b"]);
            expect(instance.rgxIsGroup).toBe(true);
        });

        it("is true for literal tokens", () => {
            const instance = new RGXPart(/test/);
            expect(instance.rgxIsGroup).toBe(true);
        });

        it("is true for class tokens with rgxIsGroup true", () => {
            const instance = new RGXPart(new TestClassToken2());
            expect(instance.rgxIsGroup).toBe(true);
        });

        it("is false for class tokens with rgxIsGroup false", () => {
            const instance = new RGXPart(new TestClassToken1());
            expect(instance.rgxIsGroup).toBe(false);
        });

        it("is true for convertible tokens with rgxGroupWrap true that return other group tokens", () => {
            const instance = new RGXPart({ toRgx: () => ["a", "b"], rgxGroupWrap: true });
            expect(instance.rgxIsGroup).toBe(true);
        });

        it("is false for convertible tokens with rgxGroupWrap true that return non-group tokens", () => {
            const instance = new RGXPart({ toRgx: () => "test", rgxGroupWrap: true });
            expect(instance.rgxIsGroup).toBe(false);
        });

        it("is false for convertible tokens with rgxGroupWrap false", () => {
            const instance = new RGXPart({ toRgx: () => ["a", "b"], rgxGroupWrap: false });
            expect(instance.rgxIsGroup).toBe(false);
        });

        it("is false for non-group tokens", () => {
            expect(new RGXPart("test").rgxIsGroup).toBe(false);
            expect(new RGXPart(123).rgxIsGroup).toBe(false);
            expect(new RGXPart(null).rgxIsGroup).toBe(false);
            expect(new RGXPart(undefined).rgxIsGroup).toBe(false);
        });
    });

    describe("rgxIsRepeatable", () => {
        it("is true for tokens with rgxIsRepeatable true", () => {
            const instance = new RGXPart({ toRgx: () => "test", rgxIsRepeatable: true });
            expect(instance.rgxIsRepeatable).toBe(true);
        });

        it("is true for convertible tokens with no rgxIsRepeatable property", () => {
            const instance = new RGXPart({ toRgx: () => "test" });
            expect(instance.rgxIsRepeatable).toBe(true);
        });

        it("is false for tokens with rgxIsRepeatable false", () => {
            const instance = new RGXPart({ toRgx: () => "test", rgxIsRepeatable: false });
            expect(instance.rgxIsRepeatable).toBe(false);
        });

        it("is true for non-convertible tokens", () => {
            const instance = new RGXPart("test");
            expect(instance.rgxIsRepeatable).toBe(true);
        });
    });

    describe("toRgx", () => {
        it("returns the original token", () => {
            const token = "test";
            const instance = new RGXPart(token);
            expect(instance.toRgx()).toBe(token);
        });
    });

    describe("clone", () => {
        it("does nothing when depth is 0", () => {
            const instance = new RGXPart("test");
            expect(instance.clone(0)).toBe(instance);
        });

        it("preserves properties", () => {
            const token = "test";
            const transform = jest.fn();
            const beforeCapture = jest.fn();
            const afterCapture = jest.fn();

            const instance = new RGXPart(token, { transform, beforeCapture, afterCapture });
            const clone = instance.clone();

            expect(clone).not.toBe(instance);
            expect(clone.token).toEqual(instance.token);
            expect(clone.transform).toBe(instance.transform);
            expect(clone.beforeCapture).toBe(instance.beforeCapture);
            expect(clone.afterCapture).toBe(instance.afterCapture);
        });
    });

    describe("validate", () => {
        it("returns true if validation passes", () => {
            const instance = new RGXPart("test", { validate: () => true });
            expect(() => instance.validate({ raw: "test", value: "test" }, new RGXWalker("test", []))).not.toThrow();
        });

        it("throws if validation fails with false", () => {
            const instance = new RGXPart("test", { validate: () => false });
            expect(() => instance.validate({ raw: "test", value: "test" }, new RGXWalker("test", []))).toThrow(RGXPartValidationFailedError);
        });

        it("throws with custom message if validation fails with a string", () => {
            const instance = new RGXPart("test", { validate: () => "Custom error message" });
            expectError(() => instance.validate({ raw: "test", value: "test" }, new RGXWalker("test", [])), RGXPartValidationFailedError, (e) => {
                return e.message === `Custom error message; Got: test (transformed: "test")`;
            });
        });
    });
});