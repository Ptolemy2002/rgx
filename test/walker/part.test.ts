import { RGXClassToken } from "src/class";
import { RGXInvalidPartError } from "src/errors";
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
        const id = "customId";
        const rawTransform = jest.fn();
        const transform = jest.fn();
        const beforeCapture = jest.fn();
        const afterCapture = jest.fn();

        const instance = constructor(token, { id, rawTransform, transform, beforeCapture, afterCapture });
        expect(instance.id).toBe(id);
        expect(instance.rawTransform).toBe(rawTransform);
        expect(instance.transform).toBe(transform);
        expect(instance.beforeCapture).toBe(beforeCapture);
        expect(instance.afterCapture).toBe(afterCapture);
    });

    it("defaults id to null if not provided", () => {
        const instance = constructor("test");
        expect(instance.id).toBeNull();
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

            expect(() => assertRGXPart({})).toThrow(RGXInvalidPartError);
            expect(() => assertRGXPart("test")).toThrow(RGXInvalidPartError);
            expect(() => assertRGXPart(123)).toThrow(RGXInvalidPartError);
            expect(() => assertRGXPart(null)).toThrow(RGXInvalidPartError);
            expect(() => assertRGXPart(undefined)).toThrow(RGXInvalidPartError);
            expect(() => assertRGXPart(instance)).toThrow(RGXInvalidPartError);
        });
    });

    describe("clone", () => {
        it("does nothing when depth is 0", () => {
            const instance = new RGXPart("test");
            expect(instance.clone(0)).toBe(instance);
        });

        it("preserves properties when id is set", () => {
            const token = "test";
            const id = "customId";
            const rawTransform = jest.fn();
            const transform = jest.fn();
            const beforeCapture = jest.fn();
            const afterCapture = jest.fn();

            const instance = new RGXPart(token, { id, rawTransform, transform, beforeCapture, afterCapture });
            const clone = instance.clone();

            expect(clone).not.toBe(instance);
            expect(clone.token).toEqual(instance.token);
            expect(clone.id).toBe(instance.id);
            expect(clone.rawTransform).toBe(instance.rawTransform);
            expect(clone.transform).toBe(instance.transform);
            expect(clone.beforeCapture).toBe(instance.beforeCapture);
            expect(clone.afterCapture).toBe(instance.afterCapture);
        });

        it("preserves properties when no id is set", () => {
            const token = "test";
            const rawTransform = jest.fn();
            const transform = jest.fn();
            const beforeCapture = jest.fn();
            const afterCapture = jest.fn();
            const afterFailure = jest.fn();
            const afterValidationFailure = jest.fn();

            const instance = new RGXPart(token, { rawTransform, transform, beforeCapture, afterCapture, afterFailure, afterValidationFailure });
            const clone = instance.clone();

            expect(clone).not.toBe(instance);
            expect(clone.token).toEqual(instance.token);
            expect(clone.id).toBeNull();
            expect(clone.rawTransform).toBe(instance.rawTransform);
            expect(clone.transform).toBe(instance.transform);
            expect(clone.beforeCapture).toBe(instance.beforeCapture);
            expect(clone.afterCapture).toBe(instance.afterCapture);
            expect(clone.afterFailure).toBe(instance.afterFailure);
            expect(clone.afterValidationFailure).toBe(instance.afterValidationFailure);
        });
    });

    describe("hasId", () => {
        it("returns true if id is not null", () => {
            const instance = new RGXPart("test", { id: "customId" });
            expect(instance.hasId()).toBe(true);
        });

        it("returns false if id is null", () => {
            const instance = new RGXPart("test");
            expect(instance.hasId()).toBe(false);
        });
    });

    describe("validate", () => {
        it("returns true if validation passes", () => {
            const instance = new RGXPart("test", { validate: () => true });
            expect(() => instance.validate({ raw: "test", value: "test", start: 0, end: 4, ownerId: null, branch: 0, groups: null }, { part: instance, walker: new RGXWalker("test", []) })).not.toThrow();
        });

        it("throws if validation fails with false", () => {
            const instance = new RGXPart("test", { validate: () => false });
            expect(() => instance.validate({ raw: "test", value: "test", start: 0, end: 4, ownerId: null, branch: 0, groups: null }, { part: instance, walker: new RGXWalker("test", []) })).toThrow(RGXPartValidationFailedError);
        });

        it("throws with custom message if validation fails with a string", () => {
            const instance = new RGXPart("test", { validate: () => "Custom error message" });
            expectError(() => instance.validate({ raw: "test", value: "test", start: 0, end: 4, ownerId: null, branch: 0, groups: null }, { part: instance, walker: new RGXWalker("test", []) }), RGXPartValidationFailedError, (e) => {
                expect(e.message).toBe(`Custom error message; ID: unknown; Got: test (transformed: "test")`);
            });
        });
    });
});