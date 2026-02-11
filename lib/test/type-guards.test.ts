import { isRGXConvertibleToken, isRGXNativeToken, isRGXNoOpToken } from 'src/index';

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
});