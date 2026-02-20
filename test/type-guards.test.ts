import { 
    isRGXConvertibleToken, isRGXLiteralToken, isRGXNativeToken, isRGXNoOpToken, RGXToken, rgxTokenType,
    assertRGXConvertibleToken, assertRGXLiteralToken, assertRGXNativeToken, assertRGXNoOpToken,
    RGXInvalidTokenError, rgxTokenTypeFlat
} from 'src/index';

function rgxConvertibleTokenTestMethodTest(returnValueDesc: string, returnValue: unknown, expected: boolean) {
    it(`${expected ? 'identifies' : 'rejects'} objects with a toRgx function that returns ${returnValueDesc}`, () => {
        const token = { toRgx: () => returnValue };
        expect(isRGXConvertibleToken(token)).toBe(expected);
        if (expected) {
            expect(() => assertRGXConvertibleToken(token)).not.toThrow();
        } else {
            expect(() => assertRGXConvertibleToken(token)).toThrow(RGXInvalidTokenError);
        }
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
        rgxConvertibleTokenTestMethodTest('null', null, true);
        rgxConvertibleTokenTestMethodTest('undefined', undefined, true);
        rgxConvertibleTokenTestMethodTest('false', false, true);

        rgxConvertibleTokenTestMethodTest('a string', 'foo', true);
        rgxConvertibleTokenTestMethodTest('an array of strings', ['foo', 'bar'], true);

        rgxConvertibleTokenTestMethodTest('a number', 14, true);
        rgxConvertibleTokenTestMethodTest('an array of numbers', [1, 2, 3], true);

        rgxConvertibleTokenTestMethodTest('a boolean', true, true);
        rgxConvertibleTokenTestMethodTest('an array of booleans', [true, false], true);

        rgxConvertibleTokenTestMethodTest('an array of strings and numbers', ['foo', 14], true);
        rgxConvertibleTokenTestMethodTest('an array of strings, numbers, and booleans', ['foo', 14, true], true);

        rgxConvertibleTokenTestMethodTest('a RegExp', /foo/, true);
        rgxConvertibleTokenTestMethodTest('an array of RegExps', [/foo/, /bar/], true);
        rgxConvertibleTokenTestMethodTest('an array of strings and RegExps', ['foo', /bar/], true);

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

        it('identifies arrays of tokens', () => {
            const token: RGXToken = ['foo', { toRgx: () => 14 }, null];
            expect(rgxTokenType(token)).toEqual(['native', 'convertible', 'no-op']);
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

        it('identifies arrays of tokens', () => {
            const token: RGXToken = ['foo', { toRgx: () => 14 }, null];
            expect(rgxTokenTypeFlat(token)).toEqual("array");
        });
    });
});