import { RGXClassToken, RGXSubpatternToken, rgxSubpattern } from "src/class";
import { RGXInvalidIdentifierError, RGXInvalidTokenError, RGXOutOfBoundsError } from "src/errors";
import { ConstructFunction } from "src/internal";

export class TestClassToken1 extends RGXClassToken {
    toRgx() {
        return "test";
    }

    clone() {
        return new TestClassToken1();
    }
}

function constructionTest(constructor: ConstructFunction<typeof RGXSubpatternToken>) {
    it("constructs an instance of RGXSubpatternToken", () => {
        const instance = constructor("myGroup");
        expect(instance).toBeInstanceOf(RGXSubpatternToken);
    });

    it("accepts a valid identifier as a pattern", () => {
        const instance = constructor("myGroup");
        expect(instance.pattern).toBe("myGroup");
    });

    it("accepts a positive integer as a pattern", () => {
        const instance = constructor(1);
        expect(instance.pattern).toBe(1);
    });

    it("throws an error for invalid identifiers", () => {
        expect(() => constructor("123invalid")).toThrow(RGXInvalidIdentifierError);
        expect(() => constructor("invalid-char!")).toThrow(RGXInvalidIdentifierError);
    });

    it("throws an error for non-positive integers", () => {
        expect(() => constructor(0)).toThrow(RGXOutOfBoundsError);
        expect(() => constructor(-1)).toThrow(RGXOutOfBoundsError);
    });

    it("floors non-integer numbers", () => {
        const instance = constructor(2.7);
        expect(instance.pattern).toBe(2);
    });
}

const isRGXSubpatternToken = RGXSubpatternToken.check;
const assertRGXSubpatternToken = RGXSubpatternToken.assert;

describe("RGXSubpatternToken", () => {
    describe("constructor", () => {
        constructionTest((...args) => new RGXSubpatternToken(...args));
    });

    describe("construct function", () => {
        constructionTest(rgxSubpattern);
    });

    describe("type guards", () => {
        it("accepts instances of RGXSubpatternToken", () => {
            const instance = new RGXSubpatternToken("myGroup");
            expect(isRGXSubpatternToken(instance)).toBe(true);
            expect(() => assertRGXSubpatternToken(instance)).not.toThrow();
        });

        it("rejects non-instances of RGXSubpatternToken", () => {
            const instance = new TestClassToken1();

            expect(isRGXSubpatternToken({})).toBe(false);
            expect(isRGXSubpatternToken("test")).toBe(false);
            expect(isRGXSubpatternToken(123)).toBe(false);
            expect(isRGXSubpatternToken(null)).toBe(false);
            expect(isRGXSubpatternToken(undefined)).toBe(false);
            expect(isRGXSubpatternToken(instance)).toBe(false);

            expect(() => assertRGXSubpatternToken({})).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXSubpatternToken("test")).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXSubpatternToken(123)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXSubpatternToken(null)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXSubpatternToken(undefined)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXSubpatternToken(instance)).toThrow(RGXInvalidTokenError);
        });
    });

    describe("toRgx", () => {
        it("returns a regex with a named backreference for string patterns", () => {
            const instance = new RGXSubpatternToken("myGroup");
            const regex = instance.toRgx();
            expect(regex).toEqual(new RegExp("\\k<myGroup>"));
        });

        it("returns a regex with a numbered backreference for numeric patterns", () => {
            const instance = new RGXSubpatternToken(3);
            const regex = instance.toRgx();
            expect(regex).toEqual(new RegExp("\\3"));
        });
    });

    describe("clone", () => {
        it("returns the same instance when depth is 0", () => {
            const instance = new RGXSubpatternToken("myGroup");
            const clone = instance.clone(0);
            expect(clone).toBe(instance);
        });

        it("creates a new instance with the same pattern", () => {
            const original = new RGXSubpatternToken("myGroup");
            const clone = original.clone();
            expect(clone).not.toBe(original);
            expect(clone.pattern).toBe(original.pattern);
        });
    });
});
