import { resolveRGXToken } from "src/resolve";

describe('resolveRGXToken', () => {
    it('resolves a single literal token', () => {
        expect(resolveRGXToken(/abc/)).toBe('(?:abc)');
    });

    it('resolves a single literal token without group wrapping', () => {
        expect(resolveRGXToken(/abc/, false)).toBe('abc');
    });

    it('resolves a single native token', () => {
        expect(resolveRGXToken('abc')).toBe('abc');
    });

    it('resolves a single convertible token', () => {
        const token = {
            toRgx: () => 'abc'
        };
        expect(resolveRGXToken(token)).toBe('abc');
    });

    it('resolves an array of tokens as a union', () => {
        const tokens = ['abc', /def/, { toRgx: () => 'ghi' }];
        expect(resolveRGXToken(tokens)).toBe('(?:abc|(?:def)|ghi)');
    });

    it('resolves an array of tokens as a union without group wrapping', () => {
        const tokens = ['abc', /def/, { toRgx: () => 'ghi' }];
        expect(resolveRGXToken(tokens, false)).toBe('abc|(?:def)|ghi');
    });

    it('resolves an array of tokens with duplicates as a union without duplicates', () => {
        const tokens = ['abc', /def/, { toRgx: () => 'ghi' }, 'abc', /def/];
        expect(resolveRGXToken(tokens)).toBe('(?:abc|(?:def)|ghi)');
    });
});