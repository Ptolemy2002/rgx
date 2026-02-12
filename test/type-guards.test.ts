import { isRGXConvertibleToken, isRGXLiteralToken, isRGXNativeToken, isRGXNoOpToken, RGXToken, rgxTokenType } from 'src/index';

function rgxConvertibleTokenTestMethodTest(returnValueDesc: string, returnValue: unknown, expected: boolean) {
    it(`${expected ? 'identifies' : 'rejects'} objects with a toRgx function that returns ${returnValueDesc}`, () => {
        const token = { toRgx: () => returnValue };
        expect(isRGXConvertibleToken(token)).toBe(expected);
    });
}

describe('Type Guards', () => {
    describe('isRGXNoOpToken', () => {
        it(`accepts null`, () => {
            expect(isRGXNoOpToken(null)).toBe(true);
        });

        it(`accepts undefined`, () => {
            expect(isRGXNoOpToken(undefined)).toBe(true);
        });

        it(`rejects false`, () => {
            expect(isRGXNoOpToken(false)).toBe(false);
        });

        it(`rejects numbers`, () => {
            expect(isRGXNoOpToken(0)).toBe(false);
            expect(isRGXNoOpToken(1)).toBe(false);
        });

        it(`rejects strings`, () => {
            expect(isRGXNoOpToken('')).toBe(false);
            expect(isRGXNoOpToken('foo')).toBe(false);
        });

        it(`rejects arrays`, () => {
            expect(isRGXNoOpToken([])).toBe(false);
            expect(isRGXNoOpToken([null])).toBe(false);
        });

        it(`rejects objects`, () => {
            expect(isRGXNoOpToken({})).toBe(false);
            expect(isRGXNoOpToken({ toRgx: () => 'foo' })).toBe(false);
        });
    });

    describe('isRGXLiteralToken', () => {
        it(`accepts RegExp objects`, () => {
            expect(isRGXLiteralToken(/foo/)).toBe(true);
            expect(isRGXLiteralToken(new RegExp('bar'))).toBe(true);
        });

        it(`rejects non-RegExp objects`, () => {
            expect(isRGXLiteralToken({})).toBe(false);
            expect(isRGXLiteralToken({ toRgx: () => 'foo' })).toBe(false);
        });

        it(`rejects primitives`, () => {
            expect(isRGXLiteralToken(null)).toBe(false);
            expect(isRGXLiteralToken(undefined)).toBe(false);
            expect(isRGXLiteralToken(false)).toBe(false);
            expect(isRGXLiteralToken(0)).toBe(false);
            expect(isRGXLiteralToken('foo')).toBe(false);
        });
    });

    describe('isRGXNativeToken', () => {
        it(`accepts strings`, () => {
            expect(isRGXNativeToken('foo')).toBe(true);
        });

        it(`accepts null`, () => {
            expect(isRGXNativeToken(null)).toBe(true);
        });

        it(`accepts undefined`, () => {
            expect(isRGXNativeToken(undefined)).toBe(true);
        });

        it(`accepts false`, () => {
            expect(isRGXNativeToken(false)).toBe(true);
        });

        it(`accepts true`, () => {
            expect(isRGXNativeToken(true)).toBe(true);
        });

        it(`accepts numbers`, () => {
            expect(isRGXNativeToken(0)).toBe(true);
            expect(isRGXNativeToken(1)).toBe(true);
        });

        it(`rejects arrays`, () => {
            expect(isRGXNativeToken([])).toBe(false);
            expect(isRGXNativeToken([null])).toBe(false);
        });

        it(`rejects objects`, () => {
            expect(isRGXNativeToken({})).toBe(false);
            expect(isRGXNativeToken({ toRgx: () => 'foo' })).toBe(false);
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

        it('rejects null', () => {
            expect(isRGXConvertibleToken(null)).toBe(false);
        });

        it('rejects objects without a toRgx method', () => {
            expect(isRGXConvertibleToken({})).toBe(false);
        });

        it('rejects objects with a non-callable toRgx property', () => {
            const token = { toRgx: 'not a function' };
            expect(isRGXConvertibleToken(token)).toBe(false);
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
});