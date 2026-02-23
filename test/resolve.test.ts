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

    it('resolves a single convertible token with no rgxGroupWrap property returning a RegExp', () => {
        const token = {
            toRgx: () => /abc/
        };
        expect(resolveRGXToken(token)).toBe('(?:abc)');
    });

    it('resolves a single convertible token with rgxGroupWrap set to false returning a RegExp', () => {
        const token = {
            toRgx: () => /abc/,
            rgxGroupWrap: false
        };
        expect(resolveRGXToken(token)).toBe('abc');
    });

    it('does not propogate groupWrap preference to nested convertible tokens', () => {
        const token = {
            toRgx: () => ["abc", { toRgx: () => /def/ }]
        };
        expect(resolveRGXToken(token, false)).toBe('abc|(?:def)');
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

    it('resolves null as an empty string', () => {
        expect(resolveRGXToken(null)).toBe('');
    });

    it('resolves undefined as an empty string', () => {
        expect(resolveRGXToken(undefined)).toBe('');
    });

    it('resolves a number native token by escaping its string representation', () => {
        expect(resolveRGXToken(42)).toBe('42');
    });

    it('resolves a boolean native token by escaping its string representation', () => {
        expect(resolveRGXToken(true)).toBe('true');
    });

    it('resolves a convertible token that returns a RegExp', () => {
        const token = { toRgx: () => /abc/ };
        expect(resolveRGXToken(token)).toBe('(?:abc)');
    });

    it('resolves a convertible token that returns an array of tokens', () => {
        const token = { toRgx: () => ['abc', /def/] };
        expect(resolveRGXToken(token)).toBe('(?:abc|(?:def))');
    });

    it('resolves an empty array as an empty string', () => {
        expect(resolveRGXToken([])).toBe('');
    });

    it('resolves a single-element array without adding a non-capturing group', () => {
        expect(resolveRGXToken(['abc'])).toBe('abc');
    });
});