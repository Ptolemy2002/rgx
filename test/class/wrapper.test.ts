import { RGXClassToken, RGXClassWrapperToken, rgxClassWrapper } from "src/class";
import { ConstructFunction } from "src/internal";
import { RGXInvalidTokenError } from "src/errors";

class TestClassToken1 extends RGXClassToken {
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

const isRgxClassWrapperToken = RGXClassWrapperToken.check;
const assertRgxClassWrapperToken = RGXClassWrapperToken.assert;

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

    describe("rgxIsGroup", () => {
        it("is true for array tokens", () => {
            const instance = new RGXClassWrapperToken(["a", "b"]);
            expect(instance.rgxIsGroup).toBe(true);
        });

        it("is true for literal tokens", () => {
            const instance = new RGXClassWrapperToken("test");
            expect(instance.rgxIsGroup).toBe(false);
        });

        it("is true for class tokens with rgxIsGroup true", () => {
            const instance = new RGXClassWrapperToken(new TestClassToken2());
            expect(instance.rgxIsGroup).toBe(true);
        });

        it("is false for class tokens with rgxIsGroup false", () => {
            const instance = new RGXClassWrapperToken(new TestClassToken1());
            expect(instance.rgxIsGroup).toBe(false);
        });

        it("is true for convertible tokens with rgxGroupWrap true that return other group tokens", () => {
            const convertibleToken = {
                rgxGroupWrap: true,
                toRgx() {
                    return ["a", "b"];
                }
            };
            const instance = new RGXClassWrapperToken(convertibleToken);
            expect(instance.rgxIsGroup).toBe(true);
        });

        it("is false for convertible tokens with rgxGroupWrap true that return non-group tokens", () => {
            const convertibleToken = {
                rgxGroupWrap: true,
                toRgx() {
                    return "test";
                }
            };
            const instance = new RGXClassWrapperToken(convertibleToken);
            expect(instance.rgxIsGroup).toBe(false);
        });

        it("is false for convertible tokens with rgxGroupWrap false", () => {
            const convertibleToken = {
                rgxGroupWrap: false,
                toRgx() {
                    return ["a", "b"];
                }
            };
            const instance = new RGXClassWrapperToken(convertibleToken);
            expect(instance.rgxIsGroup).toBe(false);
        });

        it("is false for non-group tokens", () => {
            expect(new RGXClassWrapperToken("test").rgxIsGroup).toBe(false);
            expect(new RGXClassWrapperToken(123).rgxIsGroup).toBe(false);
            expect(new RGXClassWrapperToken(null).rgxIsGroup).toBe(false);
            expect(new RGXClassWrapperToken(undefined).rgxIsGroup).toBe(false);
        });
    });

    describe("rgxIsRepeatable", () => {
        it("is true for class tokens with rgxIsRepeatable true", () => {
            const instance = new RGXClassWrapperToken(new TestClassToken1());
            expect(instance.rgxIsRepeatable).toBe(true);
        });

        it("is false for class tokens with rgxIsRepeatable false", () => {
            const instance = new RGXClassWrapperToken(new TestClassToken2());
            expect(instance.rgxIsRepeatable).toBe(false);
        });

        it("is true for non-class tokens", () => {
            const instance1 = new RGXClassWrapperToken("test");
            expect(instance1.rgxIsRepeatable).toBe(true);

            const instance2 = new RGXClassWrapperToken(["a", "b"]);
            expect(instance2.rgxIsRepeatable).toBe(true);
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