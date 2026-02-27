import {
    isRGXConvertibleToken, isRGXLiteralToken, isRGXNativeToken, isRGXNoOpToken, RGXToken, rgxTokenType,
    assertRGXConvertibleToken, assertRGXLiteralToken, assertRGXNativeToken, assertRGXNoOpToken,
    RGXInvalidTokenError, rgxTokenTypeFlat, isRGXToken, assertRGXToken,
    RGXTokenTypeGuardInput, rgxTokenTypeToFlat, rgxTokenTypeGuardInputToFlat, isRGXArrayToken,
    assertRGXArrayToken, rgxTokenFromType,
    RGXClassToken,
    isValidIdentifier, assertValidIdentifier,
    RGXInvalidIdentifierError, ExtRegExp,
    RGXTokenCollection, isRGXGroupedToken, assertRGXGroupedToken,
    extRegExp
} from 'src/index';

class TestClassToken1 extends RGXClassToken {
    toRgx() {
        return "test";
    }

    clone() {
        return new TestClassToken1();
    }
}

class TestClassToken2 extends RGXClassToken {
    toRgx() {
        return "test";
    }

    clone() {
        return new TestClassToken2();
    }
}

class TestClassToken3 extends RGXClassToken {
    get isGroup() {
        return true as const;
    }

    toRgx() {
        return "test";
    }

    clone() {
        return new TestClassToken3();
    }
}

function rgxConvertibleTokenMethodTest(returnValueDesc: string, returnValue: unknown, expected: boolean) {
    it(`${expected ? 'accepts' : 'rejects'} objects with a toRgx function that returns ${returnValueDesc} with returnCheck=true`, () => {
        const token = { toRgx: () => returnValue };
        expect(isRGXConvertibleToken(token)).toBe(expected);
        if (expected) {
            expect(() => assertRGXConvertibleToken(token)).not.toThrow();
        } else {
            expect(() => assertRGXConvertibleToken(token)).toThrow(RGXInvalidTokenError);
        }
    });

    it(`accepts objects with a toRgx function that returns ${returnValueDesc} with returnCheck=false`, () => {
        const token = { toRgx: () => returnValue };
        // Always true since we're not checking the return value
        expect(isRGXConvertibleToken(token, false)).toBe(true);
        expect(() => assertRGXConvertibleToken(token, false)).not.toThrow();
    });
}

describe('Type Guards', () => {
    describe('isRGXNoOpToken', () => {
        it(`accepts null`, () => {
            expect(isRGXNoOpToken(null)).toBe(true);
            expect(() => assertRGXNoOpToken(null)).not.toThrow();
        });

        it(`accepts undefined`, () => {
            expect(isRGXNoOpToken(undefined)).toBe(true);
            expect(() => assertRGXNoOpToken(undefined)).not.toThrow();
        });

        it(`rejects false`, () => {
            expect(isRGXNoOpToken(false)).toBe(false);
            expect(() => assertRGXNoOpToken(false)).toThrow(RGXInvalidTokenError);
        });

        it(`rejects numbers`, () => {
            expect(isRGXNoOpToken(0)).toBe(false);
            expect(isRGXNoOpToken(1)).toBe(false);

            expect(() => assertRGXNoOpToken(0)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXNoOpToken(1)).toThrow(RGXInvalidTokenError);
        });

        it(`rejects strings`, () => {
            expect(isRGXNoOpToken('')).toBe(false);
            expect(isRGXNoOpToken('foo')).toBe(false);

            expect(() => assertRGXNoOpToken('')).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXNoOpToken('foo')).toThrow(RGXInvalidTokenError);
        });

        it(`rejects arrays`, () => {
            expect(isRGXNoOpToken([])).toBe(false);
            expect(isRGXNoOpToken([null])).toBe(false);

            expect(() => assertRGXNoOpToken([])).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXNoOpToken([null])).toThrow(RGXInvalidTokenError);
        });

        it(`rejects objects`, () => {
            expect(isRGXNoOpToken({})).toBe(false);
            expect(isRGXNoOpToken({ toRgx: () => 'foo' })).toBe(false);

            expect(() => assertRGXNoOpToken({})).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXNoOpToken({ toRgx: () => 'foo' })).toThrow(RGXInvalidTokenError);
        });
    });

    describe('isRGXLiteralToken', () => {
        it(`accepts RegExp objects`, () => {
            expect(isRGXLiteralToken(/foo/)).toBe(true);
            expect(isRGXLiteralToken(new RegExp('bar'))).toBe(true);

            expect(() => assertRGXLiteralToken(/foo/)).not.toThrow();
            expect(() => assertRGXLiteralToken(new RegExp('bar'))).not.toThrow();
        });

        it("Accepts ExtRegExp objects", () => {
            expect(isRGXLiteralToken(new ExtRegExp('foo'))).toBe(true);
            expect(() => assertRGXLiteralToken(new ExtRegExp('foo'))).not.toThrow();
        });

        it(`rejects non-RegExp objects`, () => {
            expect(isRGXLiteralToken({})).toBe(false);
            expect(isRGXLiteralToken({ toRgx: () => 'foo' })).toBe(false);

            expect(() => assertRGXLiteralToken({})).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXLiteralToken({ toRgx: () => 'foo' })).toThrow(RGXInvalidTokenError);
        });

        it(`rejects primitives`, () => {
            expect(isRGXLiteralToken(null)).toBe(false);
            expect(isRGXLiteralToken(undefined)).toBe(false);
            expect(isRGXLiteralToken(false)).toBe(false);
            expect(isRGXLiteralToken(0)).toBe(false);
            expect(isRGXLiteralToken('foo')).toBe(false);

            expect(() => assertRGXLiteralToken(null)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXLiteralToken(undefined)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXLiteralToken(false)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXLiteralToken(0)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXLiteralToken('foo')).toThrow(RGXInvalidTokenError);
        });
    });

    describe('isRGXNativeToken', () => {
        it(`accepts strings`, () => {
            expect(isRGXNativeToken('foo')).toBe(true);
            expect(() => assertRGXNativeToken('foo')).not.toThrow();
        });

        it(`accepts null`, () => {
            expect(isRGXNativeToken(null)).toBe(true);
            expect(() => assertRGXNativeToken(null)).not.toThrow();
        });

        it(`accepts undefined`, () => {
            expect(isRGXNativeToken(undefined)).toBe(true);
            expect(() => assertRGXNativeToken(undefined)).not.toThrow();
        });

        it(`accepts false`, () => {
            expect(isRGXNativeToken(false)).toBe(true);
            expect(() => assertRGXNativeToken(false)).not.toThrow();
        });

        it(`accepts true`, () => {
            expect(isRGXNativeToken(true)).toBe(true);
            expect(() => assertRGXNativeToken(true)).not.toThrow();
        });

        it(`accepts numbers`, () => {
            expect(isRGXNativeToken(0)).toBe(true);
            expect(isRGXNativeToken(1)).toBe(true);

            expect(() => assertRGXNativeToken(0)).not.toThrow();
            expect(() => assertRGXNativeToken(1)).not.toThrow();
        });

        it(`rejects arrays`, () => {
            expect(isRGXNativeToken([])).toBe(false);
            expect(isRGXNativeToken([null])).toBe(false);

            expect(() => assertRGXNativeToken([])).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXNativeToken([null])).toThrow(RGXInvalidTokenError);
        });

        it(`rejects objects`, () => {
            expect(isRGXNativeToken({})).toBe(false);
            expect(isRGXNativeToken({ toRgx: () => 'foo' })).toBe(false);

            expect(() => assertRGXNativeToken({})).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXNativeToken({ toRgx: () => 'foo' })).toThrow(RGXInvalidTokenError);
        });
    });

    describe('isRGXConvertibleToken', () => {
        rgxConvertibleTokenMethodTest('null', null, true);
        rgxConvertibleTokenMethodTest('undefined', undefined, true);
        rgxConvertibleTokenMethodTest('false', false, true);

        rgxConvertibleTokenMethodTest('a string', 'foo', true);
        rgxConvertibleTokenMethodTest('an array of strings', ['foo', 'bar'], true);

        rgxConvertibleTokenMethodTest('a number', 14, true);
        rgxConvertibleTokenMethodTest('an array of numbers', [1, 2, 3], true);

        rgxConvertibleTokenMethodTest('a boolean', true, true);
        rgxConvertibleTokenMethodTest('an array of booleans', [true, false], true);

        rgxConvertibleTokenMethodTest('an array of strings and numbers', ['foo', 14], true);
        rgxConvertibleTokenMethodTest('an array of strings, numbers, and booleans', ['foo', 14, true], true);

        rgxConvertibleTokenMethodTest('a RegExp', /foo/, true);
        rgxConvertibleTokenMethodTest('an array of RegExps', [/foo/, /bar/], true);
        rgxConvertibleTokenMethodTest('an array of strings and RegExps', ['foo', /bar/], true);

        rgxConvertibleTokenMethodTest('another convertible token', { toRgx: () => 'foo' }, true);
        rgxConvertibleTokenMethodTest('an array of convertible tokens', [{ toRgx: () => 'foo' }, { toRgx: () => 14 }], true);

        it('rejects null', () => {
            expect(isRGXConvertibleToken(null)).toBe(false);
            expect(() => assertRGXConvertibleToken(null)).toThrow(RGXInvalidTokenError);
        });

        it('rejects objects without a toRgx method', () => {
            expect(isRGXConvertibleToken({})).toBe(false);
            expect(() => assertRGXConvertibleToken({})).toThrow(RGXInvalidTokenError);
        });

        it('rejects objects with a non-callable toRgx property', () => {
            const token = { toRgx: 'not a function' };
            expect(isRGXConvertibleToken(token)).toBe(false);
            expect(() => assertRGXConvertibleToken(token)).toThrow(RGXInvalidTokenError);
        });

        rgxConvertibleTokenMethodTest('an object (invalid return)', { invalid: true }, false);
        rgxConvertibleTokenMethodTest('an array containing an object (invalid element)', [{ invalid: true }], false);

        it('rejects undefined as a value (not an object)', () => {
            expect(isRGXConvertibleToken(undefined)).toBe(false);
            expect(() => assertRGXConvertibleToken(undefined)).toThrow(RGXInvalidTokenError);
        });

        it('rejects primitives', () => {
            expect(isRGXConvertibleToken('foo')).toBe(false);
            expect(isRGXConvertibleToken(42)).toBe(false);
            expect(isRGXConvertibleToken(true)).toBe(false);

            expect(() => assertRGXConvertibleToken('foo')).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXConvertibleToken(42)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXConvertibleToken(true)).toThrow(RGXInvalidTokenError);
        });

        it('accepts objects with an rgxGroupWrap property that is a boolean', () => {
            const token = { toRgx: () => 'foo', rgxGroupWrap: true };
            expect(isRGXConvertibleToken(token)).toBe(true);
            expect(() => assertRGXConvertibleToken(token)).not.toThrow();
        });

        it('rejects objects with an rgxGroupWrap property that is not a boolean', () => {
            const token = { toRgx: () => 'foo', rgxGroupWrap: 'not a boolean' };
            expect(isRGXConvertibleToken(token)).toBe(false);
            expect(() => assertRGXConvertibleToken(token)).toThrow(RGXInvalidTokenError);
        });
    });

    describe('isRGXArrayToken', () => {
        it('accepts arrays of valid tokens', () => {
            const token: RGXToken = ['foo', { toRgx: () => 14 }, null, /foo/, ['nested array']];
            expect(isRGXArrayToken(token)).toBe(true);
            expect(() => assertRGXArrayToken(token)).not.toThrow();
        });

        it('rejects arrays containing invalid tokens when contentCheck is true', () => {
            const token = ['foo', { invalid: true }];
            expect(isRGXArrayToken(token, true)).toBe(false);
            expect(() => assertRGXArrayToken(token, true)).toThrow(RGXInvalidTokenError);
        });

        it('accepts arrays containing invalid tokens when contentCheck is false', () => {
            const token = ['foo', { invalid: true }];
            expect(isRGXArrayToken(token, false)).toBe(true);
            expect(() => assertRGXArrayToken(token, false)).not.toThrow();
        });

        it('rejects non-array values', () => {
            expect(isRGXArrayToken('not an array')).toBe(false);
            expect(() => assertRGXArrayToken('not an array')).toThrow(RGXInvalidTokenError);
        });
    });

    describe('isRGXGroupedToken', () => {
        it('accepts array tokens with valid content when contentCheck is true', () => {
            const token: RGXToken = ['foo', { toRgx: () => 14 }, null, /foo/, ['nested array']];
            expect(isRGXGroupedToken(token, true)).toBe(true);
            expect(() => assertRGXGroupedToken(token, true)).not.toThrow();
        });

        it('rejects array tokens containing invalid tokens when contentCheck is true', () => {
            const token = ['foo', { invalid: true }];
            expect(isRGXGroupedToken(token, true)).toBe(false);
            expect(() => assertRGXGroupedToken(token, true)).toThrow(RGXInvalidTokenError);
        });

        it('accepts array tokens containing invalid tokens when contentCheck is false', () => {
            const token = ['foo', { invalid: true }];
            expect(isRGXGroupedToken(token, false)).toBe(true);
            expect(() => assertRGXGroupedToken(token, false)).not.toThrow();
        });

        it('accepts literal tokens', () => {
            const token1 = /foo/;
            const token2 = extRegExp('bar');

            expect(isRGXGroupedToken(token1)).toBe(true);
            expect(isRGXGroupedToken(token2)).toBe(true);

            expect(() => assertRGXGroupedToken(token1)).not.toThrow();
            expect(() => assertRGXGroupedToken(token2)).not.toThrow();
        });

        it('accepts class tokens with isGroup property set to true', () => {
            const token = new TestClassToken3();
            expect(isRGXGroupedToken(token)).toBe(true);
            expect(() => assertRGXGroupedToken(token)).not.toThrow();
        });

        it('rejects class tokens without isGroup property set to true', () => {
            const token1 = new TestClassToken1();
            const token2 = new TestClassToken2();

            expect(isRGXGroupedToken(token1)).toBe(false);
            expect(isRGXGroupedToken(token2)).toBe(false);

            expect(() => assertRGXGroupedToken(token1)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXGroupedToken(token2)).toThrow(RGXInvalidTokenError);
        });

        it('accepts convertible tokens with rgxGroupWrap set to true and returning a grouped token when contentCheck is true', () => {
            const token1 = { toRgx: () => ['foo', 'bar'], rgxGroupWrap: true };
            const token2 = { toRgx: () => /foo/, rgxGroupWrap: true };

            expect(isRGXGroupedToken(token1, true)).toBe(true);
            expect(isRGXGroupedToken(token2, true)).toBe(true);

            expect(() => assertRGXGroupedToken(token1, true)).not.toThrow();
            expect(() => assertRGXGroupedToken(token2, true)).not.toThrow();
        });

        it('rejects convertible tokens with rgxGroupWrap set to true and not returning a grouped token when contentCheck is true', () => {
            const token1 = { toRgx: () => 'foo', rgxGroupWrap: true };
            const token2 = { toRgx: () => 'bar', rgxGroupWrap: true };

            expect(isRGXGroupedToken(token1, true)).toBe(false);
            expect(isRGXGroupedToken(token2, true)).toBe(false);

            expect(() => assertRGXGroupedToken(token1, true)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXGroupedToken(token2, true)).toThrow(RGXInvalidTokenError);
        });

        it('accepts convertible tokens with rgxGroupWrap set to true and not returning a grouped token when contentCheck is false', () => {
            const token1 = { toRgx: () => 'foo', rgxGroupWrap: true };
            const token2 = { toRgx: () => 'bar', rgxGroupWrap: true };

            expect(isRGXGroupedToken(token1, false)).toBe(true);
            expect(isRGXGroupedToken(token2, false)).toBe(true);

            expect(() => assertRGXGroupedToken(token1, false)).not.toThrow();
            expect(() => assertRGXGroupedToken(token2, false)).not.toThrow();
        });

        it('rejects convertible tokens with rgxGroupWrap set to false', () => {
            const token1 = { toRgx: () => 'foo', rgxGroupWrap: false };
            const token2 = { toRgx: () => 'bar', rgxGroupWrap: false };

            expect(isRGXGroupedToken(token1, false)).toBe(false);
            expect(isRGXGroupedToken(token2, false)).toBe(false);

            expect(() => assertRGXGroupedToken(token1, false)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXGroupedToken(token2, false)).toThrow(RGXInvalidTokenError);
        });

        it('rejects convertible tokens with rgxGroupWrap not set', () => {
            const token = { toRgx: () => 'foo' };
            expect(isRGXGroupedToken(token)).toBe(false);
            expect(() => assertRGXGroupedToken(token)).toThrow(RGXInvalidTokenError);
        });

        it('rejects non-array, non-literal, non-class, non-convertible tokens', () => {
            expect(isRGXGroupedToken({invalid: true})).toBe(false);
            expect(isRGXGroupedToken('foo')).toBe(false);
            expect(isRGXGroupedToken(42)).toBe(false);
            expect(isRGXGroupedToken(null)).toBe(false);
            expect(isRGXGroupedToken(true)).toBe(false);

            expect(() => assertRGXGroupedToken({invalid: true})).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXGroupedToken('foo')).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXGroupedToken(42)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXGroupedToken(null)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXGroupedToken(true)).toThrow(RGXInvalidTokenError);
        });
    });

    describe('rgxTokenType', () => {
        it('identifies no-op tokens', () => {
            expect(rgxTokenType(null)).toBe('no-op');
            expect(rgxTokenType(undefined)).toBe('no-op');
        });

        it('identifies literal tokens', () => {
            expect(rgxTokenType(/foo/)).toBe('literal');
            expect(rgxTokenType(new RegExp('bar'))).toBe('literal');
        });

        it('identifies native tokens', () => {
            expect(rgxTokenType('foo')).toBe('native');
            expect(rgxTokenType(14)).toBe('native');
            expect(rgxTokenType(true)).toBe('native');
        });

        it('identifies convertible tokens', () => {
            const token: RGXToken = { toRgx: () => 'foo' };
            expect(rgxTokenType(token)).toBe('convertible');
        });

        it('identifies class tokens when recognizeClass is true', () => {
            const token: RGXToken = new TestClassToken1();
            expect(rgxTokenType(token, true)).toBe('class');
        });

        it('identifies class tokens as convertible when recognizeClass is false', () => {
            const token: RGXToken = new TestClassToken1();
            expect(rgxTokenType(token, false)).toBe('convertible');
        });

        it('identifies arrays of tokens', () => {
            const token: RGXToken = ['foo', { toRgx: () => 14 }, null];
            expect(rgxTokenType(token)).toEqual(['native', 'convertible', 'no-op']);
        });

        it('rejects invalid tokens', () => {
            expect(() => rgxTokenType({})).toThrow(RGXInvalidTokenError);
            expect(() => rgxTokenType({ toRgx: 'not a function' })).toThrow(RGXInvalidTokenError);
            expect(() => rgxTokenType(['foo', { invalid: true }])).toThrow(RGXInvalidTokenError);
        });
    });

    describe('rgxTokenTypeFlat', () => {
        it('identifies no-op tokens', () => {
            expect(rgxTokenTypeFlat(null)).toBe('no-op');
            expect(rgxTokenTypeFlat(undefined)).toBe('no-op');
        });

        it('identifies literal tokens', () => {
            expect(rgxTokenTypeFlat(/foo/)).toBe('literal');
            expect(rgxTokenTypeFlat(new RegExp('bar'))).toBe('literal');
        });

        it('identifies native tokens', () => {
            expect(rgxTokenTypeFlat('foo')).toBe('native');
            expect(rgxTokenTypeFlat(14)).toBe('native');
            expect(rgxTokenTypeFlat(true)).toBe('native');
        });

        it('identifies convertible tokens', () => {
            const token: RGXToken = { toRgx: () => 'foo' };
            expect(rgxTokenTypeFlat(token)).toBe('convertible');
        });

        it('identifies class tokens when recognizeClass is true', () => {
            const token: RGXToken = new TestClassToken1();
            expect(rgxTokenTypeFlat(token, true)).toBe('class');
        });

        it('identifies class tokens as convertible when recognizeClass is false', () => {
            const token: RGXToken = new TestClassToken1();
            expect(rgxTokenTypeFlat(token, false)).toBe('convertible');
        });

        it('identifies arrays of tokens', () => {
            const token: RGXToken = ['foo', { toRgx: () => 14 }, null];
            expect(rgxTokenTypeFlat(token)).toEqual("array");
        });

        it('rejects invalid tokens', () => {
            expect(() => rgxTokenTypeFlat({})).toThrow(RGXInvalidTokenError);
            expect(() => rgxTokenTypeFlat({ toRgx: 'not a function' })).toThrow(RGXInvalidTokenError);
            expect(() => rgxTokenTypeFlat(['foo', { invalid: true }])).toThrow(RGXInvalidTokenError);
        });
    });

    describe('isRGXToken', () => {
        it('returns true for every valid token type when a specific type is not specified', () => {
            expect(isRGXToken(null)).toBe(true);
            expect(isRGXToken(undefined)).toBe(true);
            expect(isRGXToken(/foo/)).toBe(true);
            expect(isRGXToken('foo')).toBe(true);
            expect(isRGXToken(14)).toBe(true);
            expect(isRGXToken(true)).toBe(true);
            expect(isRGXToken({ toRgx: () => 'foo' })).toBe(true);
            expect(isRGXToken(['foo', { toRgx: () => 14 }, null])).toBe(true);

            expect(() => assertRGXToken(null)).not.toThrow();
            expect(() => assertRGXToken(undefined)).not.toThrow();
            expect(() => assertRGXToken(/foo/)).not.toThrow();
            expect(() => assertRGXToken('foo')).not.toThrow();
            expect(() => assertRGXToken(14)).not.toThrow();
            expect(() => assertRGXToken(true)).not.toThrow();
            expect(() => assertRGXToken({ toRgx: () => 'foo' })).not.toThrow();
            expect(() => assertRGXToken(['foo', { toRgx: () => 14 }, null])).not.toThrow();
        });

        it('returns false for invalid tokens when a specific type is not specified', () => {
            expect(isRGXToken({})).toBe(false);
            expect(isRGXToken({ toRgx: 'not a function' })).toBe(false);
            expect(isRGXToken(['foo', { invalid: true }])).toBe(false);

            expect(() => assertRGXToken({})).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXToken({ toRgx: 'not a function' })).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXToken(['foo', { invalid: true }])).toThrow(RGXInvalidTokenError);
        });

        it('identifies no-op tokens correctly', () => {
            expect(isRGXToken(null, 'no-op')).toBe(true);
            expect(isRGXToken(undefined, 'no-op')).toBe(true);
            expect(isRGXToken(false, 'no-op')).toBe(false);

            expect(() => assertRGXToken(null, 'no-op')).not.toThrow();
            expect(() => assertRGXToken(undefined, 'no-op')).not.toThrow();
            expect(() => assertRGXToken(false, 'no-op')).toThrow(RGXInvalidTokenError);
        });

        it('identifies literal tokens correctly', () => {
            expect(isRGXToken(/foo/, 'literal')).toBe(true);
            expect(isRGXToken(new RegExp('bar'), 'literal')).toBe(true);
            expect(isRGXToken('foo', 'literal')).toBe(false);

            expect(() => assertRGXToken(/foo/, 'literal')).not.toThrow();
            expect(() => assertRGXToken(new RegExp('bar'), 'literal')).not.toThrow();
            expect(() => assertRGXToken('foo', 'literal')).toThrow(RGXInvalidTokenError);
        });

        it('identifies native tokens correctly', () => {
            expect(isRGXToken('foo', 'native')).toBe(true);
            expect(isRGXToken(14, 'native')).toBe(true);
            expect(isRGXToken(true, 'native')).toBe(true);
            expect(isRGXToken(null, 'native')).toBe(true);
            expect(isRGXToken(undefined, 'native')).toBe(true);
            expect(isRGXToken(/foo/, 'native')).toBe(false);

            expect(() => assertRGXToken('foo', 'native')).not.toThrow();
            expect(() => assertRGXToken(14, 'native')).not.toThrow();
            expect(() => assertRGXToken(true, 'native')).not.toThrow();
            expect(() => assertRGXToken(null, 'native')).not.toThrow();
            expect(() => assertRGXToken(undefined, 'native')).not.toThrow();
            expect(() => assertRGXToken(/foo/, 'native')).toThrow(RGXInvalidTokenError);
        });

        it('identifies convertible tokens correctly', () => {
            const token: RGXToken = { toRgx: () => 'foo' };
            expect(isRGXToken(token, 'convertible')).toBe(true);
            expect(isRGXToken(42, 'convertible')).toBe(false);

            expect(() => assertRGXToken(token, 'convertible')).not.toThrow();
            expect(() => assertRGXToken(42, 'convertible')).toThrow(RGXInvalidTokenError);
        });

        it('identifies class tokens as class', () => {
            const token: RGXToken = new TestClassToken1();
            expect(isRGXToken(token, 'class')).toBe(true);

            expect(() => assertRGXToken(token, 'class')).not.toThrow();
        });

        it('identifies class tokens as convertible', () => {
            const token: RGXToken = new TestClassToken1();
            expect(isRGXToken(token, 'convertible')).toBe(true);
            
            expect(() => assertRGXToken(token, 'convertible')).not.toThrow();
        });

        it('identifies arrays of tokens correctly', () => {
            const token: RGXToken = ['foo', { toRgx: () => 14 }, null];
            expect(isRGXToken(token, 'array')).toBe(true);
            expect(isRGXToken('not an array', 'array')).toBe(false);

            expect(() => assertRGXToken(token, 'array')).not.toThrow();
            expect(() => assertRGXToken('not an array', 'array')).toThrow(RGXInvalidTokenError);
        });

        it('identifies arrays of tokens with specific types correctly', () => {
            const tokenType: RGXTokenTypeGuardInput = ['native', 'convertible', 'no-op', 'literal', 'array'] as const;
            const matchingToken: RGXToken = ['foo', { toRgx: () => 14 }, null, /foo/, ['nested array']];

            expect(isRGXToken(matchingToken, tokenType)).toBe(true);
            expect(isRGXToken(matchingToken, ['native', 'convertible'] as const)).toBe(false);

            expect(() => assertRGXToken(matchingToken, tokenType)).not.toThrow();
            expect(() => assertRGXToken(matchingToken, ['native', 'convertible'] as const)).toThrow(RGXInvalidTokenError);
        });

        it('correctly handles constructors', () => {
            const token1: RGXToken = new TestClassToken1();
            const token2: RGXToken = new TestClassToken2();

            expect(isRGXToken(token1, TestClassToken1)).toBe(true);
            expect(isRGXToken(token2, TestClassToken2)).toBe(true);
            expect(isRGXToken(token1, TestClassToken2)).toBe(false);
            expect(isRGXToken(token2, TestClassToken1)).toBe(false);

            expect(() => assertRGXToken(token1, TestClassToken1)).not.toThrow();
            expect(() => assertRGXToken(token2, TestClassToken2)).not.toThrow();
            expect(() => assertRGXToken(token1, TestClassToken2)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXToken(token2, TestClassToken1)).toThrow(RGXInvalidTokenError);
        });

        it('rejects arrays that include invalid tokens when a specific type is not specified', () => {
            const token = ['foo', { invalid: true }];
            expect(isRGXToken(token)).toBe(false);
            expect(() => assertRGXToken(token)).toThrow(RGXInvalidTokenError);
        });

        it('rejects arrays that include invalid tokens when a specific type is specified', () => {
            const token = ['foo', { invalid: true }];
            expect(isRGXToken(token, ['native', 'convertible'] as const)).toBe(false);
            expect(() => assertRGXToken(token, ['native', 'convertible'] as const)).toThrow(RGXInvalidTokenError);
        });

        it('rejects arrays where element types do not match the specified type array', () => {
            const token: RGXToken = ['foo', /bar/];
            // 'literal' and 'native' are swapped relative to actual types
            expect(isRGXToken(token, ['literal', 'native'] as const)).toBe(false);
            expect(() => assertRGXToken(token, ['literal', 'native'] as const)).toThrow(RGXInvalidTokenError);
        });

        it('rejects values that are not arrays when the specified type is an array', () => {
            expect(isRGXToken('not an array', ['native'] as const)).toBe(false);
            expect(() => assertRGXToken('not an array', ['native'] as const)).toThrow(RGXInvalidTokenError);
        });

        it('rejects when values is shorter than specified type array when matchLength is true', () => {
            const token: RGXToken = ['foo'];
            expect(isRGXToken(token, ['native', 'convertible'] as const)).toBe(false);
            expect(() => assertRGXToken(token, ['native', 'convertible'] as const)).toThrow(RGXInvalidTokenError);
        });

        it('rejects when values is shorter than specified type array when matchLength is false', () => {
            const token: RGXToken = ['foo'];
            expect(isRGXToken(token, ['native', 'convertible'] as const, false)).toBe(false);
            expect(() => assertRGXToken(token, ['native', 'convertible'] as const, false)).toThrow(RGXInvalidTokenError);
        });

        it('rejects when values is longer than specified type array when matchLength is true', () => {
            const token: RGXToken = ['foo', { toRgx: () => 14 }, null];
            expect(isRGXToken(token, ['native', 'convertible'] as const)).toBe(false);
            expect(() => assertRGXToken(token, ['native', 'convertible'] as const)).toThrow(RGXInvalidTokenError);
        });

        it('accepts when values is longer than specified type array when matchLength is false', () => {
            const token: RGXToken = ['foo', { toRgx: () => 14 }, null];
            expect(isRGXToken(token, ['native', 'convertible'] as const, false)).toBe(true);
            expect(() => assertRGXToken(token, ['native', 'convertible'] as const, false)).not.toThrow();
        });

        it('accepts the ExtRegExp constructor', () => {
            const token = new ExtRegExp('foo');
            expect(isRGXToken(token, ExtRegExp)).toBe(true);
            expect(() => assertRGXToken(token, ExtRegExp)).not.toThrow();
        });

        it('accepts the RGXTokenCollection constructor', () => {
            const token = new RGXTokenCollection(['foo', { toRgx: () => 14 }, null]);
            expect(isRGXToken(token, RGXTokenCollection)).toBe(true);
            expect(() => assertRGXToken(token, RGXTokenCollection)).not.toThrow();
        });

        it('Recognizes ExtRegexp instances as literal tokens', () => {
            const token = new ExtRegExp('foo');
            expect(isRGXToken(token, 'literal')).toBe(true);
            expect(() => assertRGXToken(token, 'literal')).not.toThrow();
        });
    });

    describe('rgxTokenTypeToFlat', () => {
        it('returns non-array types as-is', () => {
            expect(rgxTokenTypeToFlat('no-op')).toBe('no-op');
            expect(rgxTokenTypeToFlat('literal')).toBe('literal');
            expect(rgxTokenTypeToFlat('native')).toBe('native');
            expect(rgxTokenTypeToFlat('convertible')).toBe('convertible');
        });

        it('returns "array" for array types', () => {
            expect(rgxTokenTypeToFlat(['native', 'literal'])).toBe('array');
            expect(rgxTokenTypeToFlat([])).toBe('array');
        });
    });

    describe('rgxTokenTypeGuardInputToFlat', () => {
        it('returns null for null', () => {
            expect(rgxTokenTypeGuardInputToFlat(null)).toBe(null);
        });

        it('returns non-array types as-is', () => {
            expect(rgxTokenTypeGuardInputToFlat('no-op')).toBe('no-op');
            expect(rgxTokenTypeGuardInputToFlat('literal')).toBe('literal');
            expect(rgxTokenTypeGuardInputToFlat('native')).toBe('native');
            expect(rgxTokenTypeGuardInputToFlat('convertible')).toBe('convertible');
            expect(rgxTokenTypeGuardInputToFlat('array')).toBe('array');
        });

        it('returns "array" for array types', () => {
            expect(rgxTokenTypeGuardInputToFlat(['native', 'literal'])).toBe('array');
            expect(rgxTokenTypeGuardInputToFlat([])).toBe('array');
        });

        it('returns "class" for class token constructors', () => {
            expect(rgxTokenTypeGuardInputToFlat(TestClassToken1)).toBe('class');
            expect(rgxTokenTypeGuardInputToFlat(TestClassToken2)).toBe('class');
        });
    });

    describe('rgxTokenFromType', () => {
        it('returns the same value it is passed', () => {
            // First argument will always be null, as it only has an effect
            // on TypeScript, and that's not what we're testing here
            expect(rgxTokenFromType(null, "foo")).toBe("foo");
            expect(rgxTokenFromType(null, 14)).toBe(14);
            expect(rgxTokenFromType(null, true)).toBe(true);
            expect(rgxTokenFromType(null, /foo/)).toEqual(/foo/);
            expect(rgxTokenFromType(null, null)).toBe(null);
            expect(rgxTokenFromType(null, undefined)).toBe(undefined);
        });
    });

    describe('isValidIdentifier', () => {
        it('accepts valid identifiers', () => {
            expect(isValidIdentifier('foo')).toBe(true);
            expect(isValidIdentifier('fooBar')).toBe(true);
            expect(isValidIdentifier('_foo')).toBe(true);
            expect(isValidIdentifier('$foo')).toBe(true);
            expect(isValidIdentifier('foo123')).toBe(true);
            expect(isValidIdentifier('_foo123')).toBe(true);
            expect(isValidIdentifier('$foo123')).toBe(true);

            expect(() => assertValidIdentifier('foo')).not.toThrow();
            expect(() => assertValidIdentifier('fooBar')).not.toThrow();
            expect(() => assertValidIdentifier('_foo')).not.toThrow();
            expect(() => assertValidIdentifier('$foo')).not.toThrow();
            expect(() => assertValidIdentifier('foo123')).not.toThrow();
            expect(() => assertValidIdentifier('_foo123')).not.toThrow();
            expect(() => assertValidIdentifier('$foo123')).not.toThrow();
        });

        it('rejects invalid identifiers', () => {
            expect(isValidIdentifier('123foo')).toBe(false);
            expect(isValidIdentifier('-foo')).toBe(false);
            expect(isValidIdentifier('foo-bar')).toBe(false);
            expect(isValidIdentifier('foo bar')).toBe(false);
            expect(isValidIdentifier('')).toBe(false);

            expect(() => assertValidIdentifier('123foo')).toThrow(RGXInvalidIdentifierError);
            expect(() => assertValidIdentifier('-foo')).toThrow(RGXInvalidIdentifierError);
            expect(() => assertValidIdentifier('foo-bar')).toThrow(RGXInvalidIdentifierError);
            expect(() => assertValidIdentifier('foo bar')).toThrow(RGXInvalidIdentifierError);
            expect(() => assertValidIdentifier('')).toThrow(RGXInvalidIdentifierError);
        });
    });
});