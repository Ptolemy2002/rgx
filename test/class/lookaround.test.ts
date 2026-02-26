import { RGXLookaroundToken, RGXLookaheadToken, RGXLookbehindToken, rgxLookahead, rgxLookbehind, RGXClassToken } from "src/class";
import { RGXTokenCollection } from "src/collection";
import { RGXInvalidTokenError } from "src/errors";
import { ConstructFunction } from "src/internal";

const isRGXLookaroundToken = RGXLookaroundToken.check;
const assertRGXLookaroundToken = RGXLookaroundToken.assert;

class TestClassToken extends RGXClassToken {
    toRgx() {
        return "test";
    }
}

function constructionTest<T extends typeof RGXLookaroundToken>(constructor: ConstructFunction<T>) {
    it("constructs an instance of RGXLookaroundToken", () => {
        const instance = constructor();
        expect(instance).toBeInstanceOf(RGXLookaroundToken);
    });

    describe("isGroup", () => {
        it("is true", () => {
            const instance = constructor() as RGXLookaroundToken;
            expect(instance.isGroup).toBe(true);
        });
    });

    describe("rgxGroupWrap", () => {
        it("is false", () => {
            const instance = constructor() as RGXLookaroundToken;
            expect(instance.rgxGroupWrap).toBe(false);
        });
    });

    it("is positive by default", () => {
        const instance = constructor() as RGXLookaroundToken;
        expect(instance.positive).toBe(true);
        expect(instance.negative).toBe(false);
    });

    it("correctly initializes with positive set to false", () => {
        const instance = constructor([], false) as RGXLookaroundToken;
        expect(instance.positive).toBe(false);
        expect(instance.negative).toBe(true);
    });

    it("correctly initializes with positive set to true", () => {
        const instance = constructor([], true) as RGXLookaroundToken;
        expect(instance.positive).toBe(true);
        expect(instance.negative).toBe(false);
    });

    it("correctly initializes with a token array", () => {
        const token = new TestClassToken();
        const instance = constructor([token]) as RGXLookaroundToken;

        expect(instance.tokens.toArray()).toEqual([token]);
    });

    it("correctly initializes with a token collection in concat mode", () => {
        const token = new TestClassToken();
        const tokenCollection = new RGXTokenCollection([token], 'concat');
        const instance = constructor(tokenCollection) as RGXLookaroundToken;

        expect(instance.tokens.toArray()).toEqual([token]);
    });

    it("correctly initializes with a token collection in union mode", () => {
        const token = new TestClassToken();
        const tokenCollection = new RGXTokenCollection([token], 'union');
        const instance = constructor(tokenCollection) as RGXLookaroundToken;

        expect(instance.tokens.toArray()).toEqual([token]);
    });
}

function negateTest<T extends typeof RGXLookaroundToken>(constructor: ConstructFunction<T>) {
    it("has the opposite positivity to the original token", () => {
        const instance = constructor() as RGXLookaroundToken;
        const negated = instance.negate();

        expect(negated.positive).toBe(!instance.positive);
        expect(negated.negative).toBe(!instance.negative);
    });

    it("preserves the original tokens", () => {
        const token = new TestClassToken();
        const instance = constructor([token]) as RGXLookaroundToken;
        const negated = instance.negate();

        expect(negated.tokens.toArray()).toEqual([token]);
    });
}

describe("RGXLookaroundToken", () => {
    describe("type guards", () => {
        it("accepts instances of RGXLookaheadToken", () => {
            const lookaheadToken = new RGXLookaheadToken([]);
            expect(isRGXLookaroundToken(lookaheadToken)).toBe(true);
            expect(() => assertRGXLookaroundToken(lookaheadToken)).not.toThrow();
        });

        it("accepts instances of RGXLookbehindToken", () => {
            const lookbehindToken = new RGXLookbehindToken([]);
            expect(isRGXLookaroundToken(lookbehindToken)).toBe(true);
            expect(() => assertRGXLookaroundToken(lookbehindToken)).not.toThrow();
        });

        it("rejects non-lookaround tokens", () => {
            expect(isRGXLookaroundToken({})).toBe(false);
            expect(isRGXLookaroundToken("test")).toBe(false);
            expect(isRGXLookaroundToken(123)).toBe(false);
            expect(isRGXLookaroundToken(null)).toBe(false);
            expect(isRGXLookaroundToken(undefined)).toBe(false);

            expect(() => assertRGXLookaroundToken({})).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXLookaroundToken("test")).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXLookaroundToken(123)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXLookaroundToken(null)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXLookaroundToken(undefined)).toThrow(RGXInvalidTokenError);
        });
    });
});

describe("RGXLookaheadToken", () => {
    describe("constructor", () => {
        constructionTest<typeof RGXLookaheadToken>((...args) => new RGXLookaheadToken(...args));

        it("constructs an instance of RGXLookaheadToken", () => {
            const instance = new RGXLookaheadToken();
            expect(instance).toBeInstanceOf(RGXLookaheadToken);
        });
    });

    describe("construct function", () => {
        constructionTest<typeof RGXLookaheadToken>(rgxLookahead);

        it("constructs an instance of RGXLookaheadToken", () => {
            const instance = rgxLookahead();
            expect(instance).toBeInstanceOf(RGXLookaheadToken);
        });
    });

    it("is not repeatable", () => {
        const instance = new RGXLookaheadToken();
        expect(instance.isRepeatable).toBe(false);
    });

    describe("negate", () => {
        negateTest<typeof RGXLookaheadToken>((...args) => new RGXLookaheadToken(...args));
    });

    describe("reverse", () => {
        it("preserves the original tokens", () => {
            const token1 = new TestClassToken();
            const token2 = new TestClassToken();
            const instance = new RGXLookaheadToken([token1, token2]);
            const reversed = instance.reverse();

            expect(reversed.tokens.toArray()).toEqual([token1, token2]);
        });

        it("preserves the original positivity", () => {
            const instance = new RGXLookaheadToken([], true);
            const reversed = instance.reverse();

            expect(reversed.positive).toBe(instance.positive);
            expect(reversed.negative).toBe(instance.negative);
        });

        it("returns an instance of RGXLookbehindToken", () => {
            const instance = new RGXLookaheadToken();
            const reversed = instance.reverse();

            expect(reversed).toBeInstanceOf(RGXLookbehindToken);
        });
    });

    describe("toRgx", () => {
        it("generates the correct regex for a positive lookahead", () => {
            const token = new TestClassToken();
            const instance = new RGXLookaheadToken([token], true);
            const rgx = instance.toRgx();

            expect(rgx).toEqual(/(?=test)/);
        });

        it("generates the correct regex for a negative lookahead", () => {
            const token = new TestClassToken();
            const instance = new RGXLookaheadToken([token], false);
            const rgx = instance.toRgx();

            expect(rgx).toEqual(/(?!test)/);
        });
    });
});

describe("RGXLookbehindToken", () => {
    describe("constructor", () => {
        constructionTest<typeof RGXLookbehindToken>((...args) => new RGXLookbehindToken(...args));

        it("constructs an instance of RGXLookbehindToken", () => {
            const instance = new RGXLookbehindToken();
            expect(instance).toBeInstanceOf(RGXLookbehindToken);
        });
    });

    describe("construct function", () => {
        constructionTest<typeof RGXLookbehindToken>(rgxLookbehind);

        it("constructs an instance of RGXLookbehindToken", () => {
            const instance = rgxLookbehind();
            expect(instance).toBeInstanceOf(RGXLookbehindToken);
        });
    });

    it("is not repeatable", () => {
        const instance = new RGXLookbehindToken();
        expect(instance.isRepeatable).toBe(false);
    });

    describe("negate", () => {
        negateTest<typeof RGXLookbehindToken>((...args) => new RGXLookbehindToken(...args));
    });

    describe("reverse", () => {
        it("preserves the original tokens", () => {
            const token1 = new TestClassToken();
            const token2 = new TestClassToken();
            const instance = new RGXLookbehindToken([token1, token2]);
            const reversed = instance.reverse();

            expect(reversed.tokens.toArray()).toEqual([token1, token2]);
        });

        it("preserves the original positivity", () => {
            const instance = new RGXLookbehindToken([], true);
            const reversed = instance.reverse();

            expect(reversed.positive).toBe(instance.positive);
            expect(reversed.negative).toBe(instance.negative);
        });

        it("returns an instance of RGXLookaheadToken", () => {
            const instance = new RGXLookbehindToken();
            const reversed = instance.reverse();

            expect(reversed).toBeInstanceOf(RGXLookaheadToken);
        });
    });

    describe("toRgx", () => {
        it("generates the correct regex for a positive lookbehind", () => {
            const token = new TestClassToken();
            const instance = new RGXLookbehindToken([token], true);
            const rgx = instance.toRgx();

            expect(rgx).toEqual(/(?<=test)/);
        });

        it("generates the correct regex for a negative lookbehind", () => {
            const token = new TestClassToken();
            const instance = new RGXLookbehindToken([token], false);
            const rgx = instance.toRgx();

            expect(rgx).toEqual(/(?<!test)/);
        });
    });
});