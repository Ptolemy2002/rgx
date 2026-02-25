import { RGXRepeatToken, RGXGroupToken, rgxRepeat, RGXClassToken } from "src/class";
import { RGXInvalidTokenError, RGXOutOfBoundsError } from "src/errors";
import { ConstructFunction } from "src/internal";

class TestClassToken extends RGXClassToken {
    toRgx() {
        return "test";
    }
}

function constructionTest(constructor: ConstructFunction<typeof RGXRepeatToken>) {
    it("constructs an instance of RGXRepeatToken", () => {
        const instance = constructor(null); // We don't care about the token for this test.
        expect(instance).toBeInstanceOf(RGXRepeatToken);
    });

    it("correctly initializes with min only", () => {
        const instance = constructor(null, 2);
        expect(instance.min).toBe(2);
        expect(instance.max).toBe(2);
    });

    it("correctly initializes with min and max", () => {
        const instance = constructor(null, 2, 5);
        expect(instance.min).toBe(2);
        expect(instance.max).toBe(5);
    });

    it("correctly initializes with min as a number and max as null", () => {
        const instance = constructor(null, 2, null);
        expect(instance.min).toBe(2);
        expect(instance.max).toBeNull();
    });

    it("leaves a group token as is", () => {
        const groupToken = new RGXGroupToken({});
        const instance = constructor(groupToken);
        expect(instance.token).toBe(groupToken);
    });

    it("leaves an array token as is", () => {
        const arrayToken = ["a", "b", "c"];
        const instance = constructor(arrayToken);
        expect(instance.token).toBe(arrayToken);
    });

    it("leaves a literal token as is", () => {
        const literalToken = /abc/;
        const instance = constructor(literalToken);
        expect(instance.token).toBe(literalToken);
    });

    it("wraps a non-group token in a group token", () => {
        const nonGroupToken = "a"; // A simple native token that is not a group.
        const instance = constructor(nonGroupToken);
        expect(instance.token).toBeInstanceOf(RGXGroupToken);
        expect((instance.token as RGXGroupToken).tokens.toArray()).toEqual([nonGroupToken]);
    });
}

const isRgxRepeatToken = RGXRepeatToken.check;
const assertRgxRepeatToken = RGXRepeatToken.assert;

describe("RGXRepeatToken", () => {
    describe("type guards", () => {
        it("accepts instances of RGXRepeatToken", () => {
            const instance = new RGXRepeatToken(null);
            expect(isRgxRepeatToken(instance)).toBe(true);
            expect(() => assertRgxRepeatToken(instance)).not.toThrow();
        });

        it("rejects non-instances of RGXRepeatToken", () => {
            const instance = new TestClassToken();

            expect(isRgxRepeatToken({})).toBe(false);
            expect(isRgxRepeatToken("test")).toBe(false);
            expect(isRgxRepeatToken(123)).toBe(false);
            expect(isRgxRepeatToken(null)).toBe(false);
            expect(isRgxRepeatToken(undefined)).toBe(false);
            expect(isRgxRepeatToken(instance)).toBe(false);

            expect(() => assertRgxRepeatToken({})).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxRepeatToken("test")).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxRepeatToken(123)).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxRepeatToken(null)).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxRepeatToken(undefined)).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxRepeatToken(instance)).toThrow(RGXInvalidTokenError);
        });
    });

    describe("constructor", () => {
        constructionTest((...args) => new RGXRepeatToken(...args));
    });

    describe("construct function", () => {
        constructionTest(rgxRepeat);
    });

    describe("isGroup", () => {
        it("is false", () => {
            const instance = new RGXRepeatToken(null);
            expect(instance.isGroup).toBe(false);
        });
    });

    describe("rgxGroupWrap", () => {
        it("is false", () => {
            const instance = new RGXRepeatToken(null);
            expect(instance.rgxGroupWrap).toBe(false);
        });
    });

    describe("min setter", () => {
        it("accepts any positive value less than max", () => {
            const instance = new RGXRepeatToken(null, 0, 5);
            expect(() => instance.min = 0).not.toThrow();
            expect(() => instance.min = 3).not.toThrow();
            expect(() => instance.min = 5).not.toThrow();
        });

        it("accepts a value equal to max", () => {
            const instance = new RGXRepeatToken(null, 0, 5);
            expect(() => instance.min = 5).not.toThrow();
        });

        it("throws if min is negative", () => {
            const instance = new RGXRepeatToken(null);
            expect(() => instance.min = -1).toThrow(RGXOutOfBoundsError);
        });

        it("throws if min is greater than max", () => {
            const instance = new RGXRepeatToken(null, 0, 5);
            expect(() => instance.min = 6).toThrow(RGXOutOfBoundsError);
        });

        it("accepts any positive value when max is null", () => {
            const instance = new RGXRepeatToken(null, 0, null);
            expect(() => instance.min = 100).not.toThrow();
        });

        it("floors non-integer values", () => {
            const instance = new RGXRepeatToken(null, 0, null);
            instance.min = 2.7;
            expect(instance.min).toBe(2);
        });
    });

    describe("max setter", () => {
        it("accepts any positive value greater than min", () => {
            const instance = new RGXRepeatToken(null, 0, null);
            expect(() => instance.max = 1).not.toThrow();
            expect(() => instance.max = 100).not.toThrow();
        });

        it("accepts a value equal to min", () => {
            const instance = new RGXRepeatToken(null, 0, null);
            expect(() => instance.max = 0).not.toThrow();
        });

        it("accepts null", () => {
            const instance = new RGXRepeatToken(null, 0, 5);
            expect(() => instance.max = null).not.toThrow();
        });

        it("throws if max is negative", () => {
            const instance = new RGXRepeatToken(null);
            expect(() => instance.max = -1).toThrow(RGXOutOfBoundsError);
        });

        it("throws if max is less than min", () => {
            const instance = new RGXRepeatToken(null, 5, null);
            expect(() => instance.max = 4).toThrow(RGXOutOfBoundsError);
        });

        it("floors non-integer values", () => {
            const instance = new RGXRepeatToken(null, 0, null);
            instance.max = 2.7;
            expect(instance.max).toBe(2);
        });
    });

    describe("repeaterSuffix", () => {
        it("returns '*' for min 0 and max null", () => {
            const instance = new RGXRepeatToken(null, 0, null);
            expect(instance.repeaterSuffix).toBe('*');
        });

        it("returns '+' for min 1 and max null", () => {
            const instance = new RGXRepeatToken(null, 1, null);
            expect(instance.repeaterSuffix).toBe('+');
        });

        it("returns '?' for min 0 and max 1", () => {
            const instance = new RGXRepeatToken(null, 0, 1);
            expect(instance.repeaterSuffix).toBe('?');
        });

        it("returns '{min,}' for min with max null", () => {
            const instance = new RGXRepeatToken(null, 2, null);
            expect(instance.repeaterSuffix).toBe('{2,}');
        });

        it("returns '{min}' for min with max equal to min", () => {
            const instance = new RGXRepeatToken(null, 3, 3);
            expect(instance.repeaterSuffix).toBe('{3}');
        });

        it("returns an empty string for min 1 and max 1", () => {
            const instance = new RGXRepeatToken(null, 1, 1);
            expect(instance.repeaterSuffix).toBe('');
        });

        it("returns '{min,max}' for different values of min and max when both are > 1", () => {
            const instance = new RGXRepeatToken(null, 2, 5);
            expect(instance.repeaterSuffix).toBe('{2,5}');
        });
    });

    describe("toRgx", () => {
        it("returns null if min and max are both 0", () => {
            const instance = new RGXRepeatToken(null, 0, 0);
            expect(instance.toRgx()).toBeNull();
        });

        it("returns a regex for min and max both non-zero", () => {
            const instance = new RGXRepeatToken("a", 2, 4);
            expect(instance.toRgx()).toBeInstanceOf(RegExp);
        });

        it("group wraps array tokens", () => {
            const instance = new RGXRepeatToken(["a", "b"], 2, 4);
            const rgx = instance.toRgx();
            expect(rgx).toBeInstanceOf(RegExp);
            expect((rgx as RegExp).source).toBe("(?:a|b){2,4}");
        });

        it("group wraps literal tokens", () => {
            const instance = new RGXRepeatToken(/abc/, 2, 4);
            const rgx = instance.toRgx();
            expect(rgx).toBeInstanceOf(RegExp);
            expect((rgx as RegExp).source).toBe("(?:abc){2,4}");
        });

        it("group wraps non-group tokens", () => {
            const instance = new RGXRepeatToken("a", 2, 4);
            const rgx = instance.toRgx();
            expect(rgx).toBeInstanceOf(RegExp);
            expect((rgx as RegExp).source).toBe("(?:a){2,4}");
        });
    });
});