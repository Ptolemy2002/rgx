import { rgxClassInit, RGXClassToken, RGXClassUnionToken } from "src/class";
import { RGXNotImplementedError } from "src/errors";

class TestClassToken extends RGXClassToken {
    toRgx() {
        return "test";
    }
}

const testToken1 = new TestClassToken();

describe("rgxClassInit", () => {
    it("doesn't implement the or method before being called", () => {
        expect(testToken1.or).toThrow(RGXNotImplementedError);
    });

    it("implements the or method after being called", () => {
        rgxClassInit();
        expect(testToken1.or).toBeDefined();
        expect(typeof testToken1.or).toBe("function");
    });
});

describe("RGXClassToken", () => {
    it("is not a group by default", () => {
        expect(testToken1.isGroup).toBe(false);
    });
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