import { RGXClassToken, RGXClassWrapperToken, rgxClassWrapper } from "src/class";
import { ConstructFunction } from "src/internal";
import { RGXInsertionRejectedError, RGXInvalidTokenError } from "src/errors";
import { defineRGXConstant, deleteRGXConstant, rgxConstant } from "src/constants";
import { RGXInsertionContext } from "src/types";
import { rgxa } from "src/index";

class TestClassToken1 extends RGXClassToken {
    toRgx() {
        return "test";
    }

    clone() {
        return new TestClassToken1();
    }
}

export class TestClassToken2 extends RGXClassToken {
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

function constructorTest(constructor: ConstructFunction<typeof RGXClassWrapperToken>) {
    it("constructs an instance of RGXClassWrapperToken", () => {
        const instance = constructor("test");
        expect(instance).toBeInstanceOf(RGXClassWrapperToken);
    });

    it("correctly initializes with a token", () => {
        const token = "test";
        const instance = constructor(token);
        expect(instance.token).toBe(token);
    });
}

export const isRgxClassWrapperToken = RGXClassWrapperToken.check;
export const assertRgxClassWrapperToken = RGXClassWrapperToken.assert;

describe("RGXClassWrapperToken", () => {
    describe("constructor", () => {
        constructorTest((...args) => new RGXClassWrapperToken(...args));
    });

    describe("construct function", () => {
        constructorTest(rgxClassWrapper);
    });

    describe("type guards", () => {
        it("accepts instances of RGXClassWrapperToken", () => {
            const instance = new RGXClassWrapperToken("test");
            expect(isRgxClassWrapperToken(instance)).toBe(true);
            expect(() => assertRgxClassWrapperToken(instance)).not.toThrow();
        });

        it("rejects non-instances of RGXClassWrapperToken", () => {
            const instance = new TestClassToken1();

            expect(isRgxClassWrapperToken({})).toBe(false);
            expect(isRgxClassWrapperToken("test")).toBe(false);
            expect(isRgxClassWrapperToken(123)).toBe(false);
            expect(isRgxClassWrapperToken(null)).toBe(false);
            expect(isRgxClassWrapperToken(undefined)).toBe(false);
            expect(isRgxClassWrapperToken(instance)).toBe(false);

            expect(() => assertRgxClassWrapperToken({})).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxClassWrapperToken("test")).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxClassWrapperToken(123)).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxClassWrapperToken(null)).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxClassWrapperToken(undefined)).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxClassWrapperToken(instance)).toThrow(RGXInvalidTokenError);
        });
    });


    describe("rgxIsRepeatable", () => {
        it("is true for tokens with rgxIsRepeatable true", () => {
            const instance = new RGXClassWrapperToken(new TestClassToken1());
            expect(instance.rgxIsRepeatable).toBe(true);
        });

        it("is true for convertible tokens with no rgxIsRepeatable property", () => {
            const instance = new RGXClassWrapperToken({ toRgx: () => "test" });
            expect(instance.rgxIsRepeatable).toBe(true);
        });

        it("is false for tokens with rgxIsRepeatable false", () => {
            const instance = new RGXClassWrapperToken(new TestClassToken2());
            expect(instance.rgxIsRepeatable).toBe(false);
        });

        it("is true for non-convertible tokens that consume characters", () => {
            const instance1 = new RGXClassWrapperToken("test");
            expect(instance1.rgxIsRepeatable).toBe(true);

            const instance2 = new RGXClassWrapperToken(["a", "b"]);
            expect(instance2.rgxIsRepeatable).toBe(true);
        });

        it("is false for tokens without an explicit preference that consume no characters", () => {
            expect(new RGXClassWrapperToken(/^/).rgxIsRepeatable).toBe(false);
            expect(new RGXClassWrapperToken({ toRgx: () => /(?=a)/ }).rgxIsRepeatable).toBe(false);
        });

        it("keeps an explicit true preference of tokens that consume no characters", () => {
            expect(new RGXClassWrapperToken({ toRgx: () => /^/, rgxIsRepeatable: true }).rgxIsRepeatable).toBe(true);
        });
    });

    describe("rgxAcceptInsertion", () => {
        const startOnly = { toRgx: () => "x", rgxAcceptInsertion: (context: RGXInsertionContext) => context.index === 0 || "must be first" };

        it("delegates to the wrapped token", () => {
            const instance = new RGXClassWrapperToken(startOnly);
            expect(rgxa([instance, "y"]).source).toBe("xy");
            expect(() => rgxa(["y", instance])).toThrow(RGXInsertionRejectedError);
        });

        it("delegates to the token a JSON class token converts to", () => {
            defineRGXConstant("test-wrapper-start-only", rgxClassWrapper(startOnly));
            try {
                const instance = new RGXClassWrapperToken(rgxConstant("test-wrapper-start-only").toJSON());
                expect(rgxa([instance, "y"]).source).toBe("xy");
                expect(() => rgxa(["y", instance])).toThrow(RGXInsertionRejectedError);
            } finally {
                deleteRGXConstant("test-wrapper-start-only");
            }
        });

        it("calls the wrapped token's toRgx() only to resolve it", () => {
            const toRgx = jest.fn(() => "x");
            const instance = new RGXClassWrapperToken({ toRgx, rgxAcceptInsertion: () => true });
            rgxa([instance]);
            expect(toRgx).toHaveBeenCalledTimes(1);
        });

        it("accepts when the wrapped token has no insertion preference", () => {
            expect(rgxa(["y", new RGXClassWrapperToken("a")]).source).toBe("ya");
            expect(rgxa(["y", new RGXClassWrapperToken({ toRgx: () => "a" })]).source).toBe("ya");
        });
    });

    describe("unwrap", () => {
        it("returns the original token", () => {
            const token = "test";
            const instance = new RGXClassWrapperToken(token);
            expect(instance.unwrap()).toBe(token);
        });
    });

    describe("toRgx", () => {
        it("returns the original token", () => {
            const token = "test";
            const instance = new RGXClassWrapperToken(token);
            expect(instance.toRgx()).toBe(token);
        });
    });

    describe("resolve", () => {
        it("doesn't double-wrap group tokens", () => {
            const instance = new RGXClassWrapperToken(["a", "b"]);
            expect(instance.resolve()).toBe("(?:a|b)");
        });
    });

    describe("clone", () => {
        it("does nothing when depth is 0", () => {
            const token = "test";
            const instance = new RGXClassWrapperToken(token);
            const clone = instance.clone(0);
            expect(clone).toBe(instance);
        });

        it("preserves properties", () => {
            const token = /test/;
            const instance = new RGXClassWrapperToken(token);
            const clone = instance.clone();
            expect(clone).not.toBe(instance);
            expect(clone.token).toEqual(token);
        });
    });
});