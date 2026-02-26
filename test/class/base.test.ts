import { rgxClassInit, RGXClassToken, RGXClassUnionToken, RGXGroupToken, RGXLookaheadToken, RGXLookbehindToken, RGXRepeatToken } from "src/class";
import { RGXNotImplementedError, RGXInvalidTokenError, RGXNotSupportedError } from "src/errors";

class TestClassToken extends RGXClassToken {
    toRgx() {
        return "test";
    }
}

const testToken1 = new TestClassToken();

export const isRgxClassToken = RGXClassToken.check;
export const assertRgxClassToken = RGXClassToken.assert;

describe("RGXClassToken type guards", () => {
    it("accepts instances of RGXClassToken", () => {
        expect(isRgxClassToken(testToken1)).toBe(true);
        expect(() => assertRgxClassToken(testToken1)).not.toThrow();
    });

    it("rejects non-instances of RGXClassToken", () => {
        expect(isRgxClassToken({})).toBe(false);
        expect(isRgxClassToken("test")).toBe(false);
        expect(isRgxClassToken(123)).toBe(false);
        expect(isRgxClassToken(null)).toBe(false);
        expect(isRgxClassToken(undefined)).toBe(false);

        expect(() => assertRgxClassToken({})).toThrow(RGXInvalidTokenError);
        expect(() => assertRgxClassToken("test")).toThrow(RGXInvalidTokenError);
        expect(() => assertRgxClassToken(123)).toThrow(RGXInvalidTokenError);
        expect(() => assertRgxClassToken(null)).toThrow(RGXInvalidTokenError);
        expect(() => assertRgxClassToken(undefined)).toThrow(RGXInvalidTokenError);
    });
});


describe("rgxClassInit", () => {
    it("doesn't implement the or method before being called", () => {
        expect(testToken1.or).toThrow(RGXNotImplementedError);
    });

    it("doesn't implement the group method before being called", () => {
        expect(testToken1.group).toThrow(RGXNotImplementedError);
    });

    it("doesn't implement the repeat method before being called", () => {
        expect(testToken1.repeat).toThrow(RGXNotImplementedError);
    });

    it("doesn't implement the asLookahead method before being called", () => {
        expect(testToken1.asLookahead).toThrow(RGXNotImplementedError);
    });

    it("doesn't implement the asLookbehind method before being called", () => {
        expect(testToken1.asLookbehind).toThrow(RGXNotImplementedError);
    });

    it("implements the or method after being called", () => {
        rgxClassInit();
        expect(testToken1.or).toBeDefined();
        expect(typeof testToken1.or).toBe("function");
    });

    it("implements the group method after being called", () => {
        rgxClassInit();
        expect(testToken1.group).toBeDefined();
        expect(typeof testToken1.group).toBe("function");
    });

    it("implements the repeat method after being called", () => {
        rgxClassInit();
        expect(testToken1.repeat).toBeDefined();
        expect(typeof testToken1.repeat).toBe("function");
    });

    it("implements the asLookahead method after being called", () => {
        rgxClassInit();
        expect(testToken1.asLookahead).toBeDefined();
        expect(typeof testToken1.asLookahead).toBe("function");
    });

    it("implements the asLookbehind method after being called", () => {
        rgxClassInit();
        expect(testToken1.asLookbehind).toBeDefined();
        expect(typeof testToken1.asLookbehind).toBe("function");
    });
});

describe("RGXClassToken", () => {
    it("is not a group by default", () => {
        expect(testToken1.isGroup).toBe(false);
    });

    it("has rgxGroupWrap as true by default", () => {
        expect(testToken1.rgxGroupWrap).toBe(true);
    });

    it("is repeatable by default", () => {
        expect(testToken1.isRepeatable).toBe(true);
    });

    it("resolves to a valid regex string via resolve()", () => {
        expect(testToken1.resolve()).toBe("test");
    });

    describe("or", () => {
        it("wraps in a union when called with no arguments", () => {
            const result = testToken1.or();
            expect(result).toBeInstanceOf(RGXClassUnionToken);
            expect((result as RGXClassUnionToken).tokens.toArray()).toEqual([testToken1]);
        });

        it("combines with another class token into a union", () => {
            const otherToken = new TestClassToken();
            const result = testToken1.or(otherToken);
            expect(result).toBeInstanceOf(RGXClassUnionToken);
            expect((result as RGXClassUnionToken).tokens.toArray()).toEqual([testToken1, otherToken]);
        });

        it("combines with multiple other class tokens into a union", () => {
            const otherToken1 = new TestClassToken();
            const otherToken2 = new TestClassToken();
            const result = testToken1.or(otherToken1, otherToken2);
            expect(result).toBeInstanceOf(RGXClassUnionToken);
            expect((result as RGXClassUnionToken).tokens.toArray()).toEqual([testToken1, otherToken1, otherToken2]);
        });

        it("combines with another non-class and non-array token into a union", () => {
            const otherToken = "other";
            const result = testToken1.or(otherToken);
            expect(result).toBeInstanceOf(RGXClassUnionToken);
            expect((result as RGXClassUnionToken).tokens.toArray()).toEqual([testToken1, otherToken]);
        });

        it("combines with multiple other non-class and non-array tokens into a union", () => {
            const otherToken1 = "other1";
            const otherToken2 = "other2";
            const result = testToken1.or(otherToken1, otherToken2);
            expect(result).toBeInstanceOf(RGXClassUnionToken);
            expect((result as RGXClassUnionToken).tokens.toArray()).toEqual([testToken1, otherToken1, otherToken2]);
        });

        it("combines with another array token into a union", () => {
            const otherTokens = ["other1", "other2"];
            const result = testToken1.or(otherTokens);
            expect(result).toBeInstanceOf(RGXClassUnionToken);
            expect((result as RGXClassUnionToken).tokens.toArray()).toEqual([testToken1, ...otherTokens]);
        });

        it("combines with multiple other array tokens into a union, flattening them", () => {
            const otherTokens1 = ["other1", "other2"];
            const otherTokens2 = ["other3", "other4"];
            const result = testToken1.or(otherTokens1, otherTokens2);
            expect(result).toBeInstanceOf(RGXClassUnionToken);
            expect((result as RGXClassUnionToken).tokens.toArray()).toEqual([testToken1, ...otherTokens1, ...otherTokens2]);
        });

        it("removes direct repeats", () => {
            const result = testToken1.or("foo", "bar", "foo");
            expect(result).toBeInstanceOf(RGXClassUnionToken);
            expect((result as RGXClassUnionToken).tokens.toArray()).toEqual([testToken1, "foo", "bar"]);
        });

        it("removes nested repeats", () => {
            const result = testToken1.or("foo", ["bar", "foo"]);
            expect(result).toBeInstanceOf(RGXClassUnionToken);
            expect((result as RGXClassUnionToken).tokens.toArray()).toEqual([testToken1, "foo", "bar"]);
        });

        it("removes references to itself", () => {
            const result = testToken1.or(testToken1, "foo", testToken1);
            expect(result).toBeInstanceOf(RGXClassUnionToken);
            expect((result as RGXClassUnionToken).tokens.toArray()).toEqual([testToken1, "foo"]);
        });
    });

    describe("group", () => {
        it("wraps in a group token", () => {
            const result = testToken1.group();
            expect(result).toBeInstanceOf(RGXGroupToken);
            expect((result as RGXGroupToken).tokens.toArray()).toEqual([testToken1]);
        });

        it("handles name correctly", () => {
            const result = testToken1.group({ name: "testGroup" });

            expect(result).toBeInstanceOf(RGXGroupToken);
            expect((result as RGXGroupToken).tokens.toArray()).toEqual([testToken1]);
            expect((result as RGXGroupToken).name).toBe("testGroup");
        });

        it("handles non-capturing correctly", () => {
            const result = testToken1.group({ capturing: false });
            expect(result).toBeInstanceOf(RGXGroupToken);
            expect((result as RGXGroupToken).tokens.toArray()).toEqual([testToken1]);
            expect((result as RGXGroupToken).capturing).toBe(false);
        });
    });

    describe("repeat", () => {
        beforeAll(() => {
            rgxClassInit();
        });

        it("wraps in a repeat token with correct min and max", () => {
            const result = testToken1.repeat(2, 5);
            expect(result).toBeInstanceOf(RGXRepeatToken);

            // The test token should be wrapped in a group token
            expect(result.token).toBeInstanceOf(RGXGroupToken);
            expect((result.token as RGXGroupToken).tokens.toArray()).toEqual([testToken1]);

            expect(result.min).toBe(2);
            expect(result.max).toBe(5);
        });

        it("handles default max correctly", () => {
            const result = testToken1.repeat(3);
            expect(result).toBeInstanceOf(RGXRepeatToken);
            
            expect(result.token).toBeInstanceOf(RGXGroupToken);
            expect((result.token as RGXGroupToken).tokens.toArray()).toEqual([testToken1]);

            expect(result.min).toBe(3);
            expect(result.max).toBe(3);
        });

        it("handles default min correctly", () => {
            const result = testToken1.repeat(undefined, 4);
            expect(result).toBeInstanceOf(RGXRepeatToken);
            
            expect(result.token).toBeInstanceOf(RGXGroupToken);
            expect((result.token as RGXGroupToken).tokens.toArray()).toEqual([testToken1]);

            expect(result.min).toBe(1);
            expect(result.max).toBe(4);
        });

        it("doesn't support lookaround tokens", () => {
            const lookaheadToken = new RGXLookaheadToken([testToken1]);
            const lookbehindToken = new RGXLookbehindToken([testToken1]);

            expect(() => lookaheadToken.repeat(2)).toThrow(RGXNotSupportedError);
            expect(() => lookbehindToken.repeat(2)).toThrow(RGXNotSupportedError);
        });
    });

    describe("optional", () => {
        beforeAll(() => {
            rgxClassInit();
        });

        it("wraps in a repeat token with min 0 and max 1", () => {
            const result = testToken1.optional();
            expect(result).toBeInstanceOf(RGXRepeatToken);

            expect(result.token).toBeInstanceOf(RGXGroupToken);
            expect((result.token as RGXGroupToken).tokens.toArray()).toEqual([testToken1]);

            expect(result.min).toBe(0);
            expect(result.max).toBe(1);
        });

        it("doesn't support lookaround tokens", () => {
            const lookaheadToken = new RGXLookaheadToken([testToken1]);
            const lookbehindToken = new RGXLookbehindToken([testToken1]);

            expect(() => lookaheadToken.optional()).toThrow(RGXNotSupportedError);
            expect(() => lookbehindToken.optional()).toThrow(RGXNotSupportedError);
        });
    });

    describe("asLookahead", () => {
        beforeAll(() => {
            rgxClassInit();
        });

        it("wraps in a lookahead token with correct positivity", () => {
            const result = testToken1.asLookahead(false);
            expect(result).toBeInstanceOf(RGXLookaheadToken);

            expect(result.tokens.toArray()).toEqual([testToken1]);
            expect(result.positive).toBe(false);
        });

        it("handles default positivity correctly", () => {
            const result = testToken1.asLookahead();
            expect(result).toBeInstanceOf(RGXLookaheadToken);

            expect(result.tokens.toArray()).toEqual([testToken1]);
            expect(result.positive).toBe(true);
        });

        it("does not wrap if already a lookahead token", () => {
            const lookaheadToken = testToken1.asLookahead();
            const result = lookaheadToken.asLookahead();
            expect(result).toBe(lookaheadToken);
        });
    });

    describe("asLookbehind", () => {
        beforeAll(() => {
            rgxClassInit();
        });

        it("wraps in a lookbehind token with correct positivity", () => {
            const result = testToken1.asLookbehind(false);
            expect(result).toBeInstanceOf(RGXLookbehindToken);

            expect(result.tokens.toArray()).toEqual([testToken1]);
            expect(result.positive).toBe(false);
        });

        it("handles default positivity correctly", () => {
            const result = testToken1.asLookbehind();
            expect(result).toBeInstanceOf(RGXLookbehindToken);

            expect(result.tokens.toArray()).toEqual([testToken1]);
            expect(result.positive).toBe(true);
        });

        it("does not wrap if already a lookbehind token", () => {
            const lookbehindToken = testToken1.asLookbehind();
            const result = lookbehindToken.asLookbehind();
            expect(result).toBe(lookbehindToken);
        });
    });
});