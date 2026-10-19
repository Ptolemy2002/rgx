import { RGXInvalidRegexStringError } from "src/errors";
import { resolveRGXToken } from "src/resolve";
import { rgxa, rgxInterpolation, rgxGroup, rgxRepeat, rgxLookahead, RGXClassUnionToken, RGXGroupToken, RGXSubpatternToken } from "src/index";

describe('resolveRGXToken', () => {
    it('resolves a single literal token', () => {
        expect(resolveRGXToken(/abc/)).toBe('(?:abc)');
    });

    it('resolves a single literal token without group wrapping', () => {
        expect(resolveRGXToken(/abc/, {groupWrap: false})).toBe('abc');
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

    it('resolves a single convertible token returning a RegExp', () => {
        const token = {
            toRgx: () => /abc/
        };
        expect(resolveRGXToken(token)).toBe('(?:abc)');
    });

    it('resolves a single convertible token returning a RegExp without group wrapping when groupWrap is false', () => {
        const token = {
            toRgx: () => /abc/
        };
        expect(resolveRGXToken(token, { groupWrap: false })).toBe('abc');
    });

    it('group wraps the result of a nested convertible token even when groupWrap is false', () => {
        const token = {
            toRgx: () => ({ toRgx: () => /a|b/ })
        };
        expect(resolveRGXToken(token, { groupWrap: false })).toBe('(?:a|b)');
    });

    it('resolves a single interpolation token with a valid regex string', () => {
        const token = {
            rgxInterpolation: "(abc)"
        };
        expect(resolveRGXToken(token)).toBe('(abc)');
    });

    it('resolves an interpolation token with an unterminated group', () => {
        const token = {
            rgxInterpolation: "(abc"
        };
        expect(resolveRGXToken(token)).toBe('(abc');
    });

    it('resolves an interpolation token with an unmatched parenthesis', () => {
        const token = {
            rgxInterpolation: "abc)"
        };
        expect(resolveRGXToken(token)).toBe('abc)');
    });

    it('resolves an interpolation token with parenthesis within character classes', () => {
        const token = {
            rgxInterpolation: "a[b(c)d]e"
        };
        expect(resolveRGXToken(token)).toBe('a[b(c)d]e');
    });

    it('treats \'[\' inside a character class as a literal when detecting unterminated groups without the v flag', () => {
        // Without the v flag, "[[]" is a complete class matching "[", so the group after it is unterminated.
        const token = {
            rgxInterpolation: "[[](a"
        };
        expect(resolveRGXToken(token)).toBe('[[](a');
    });

    it('treats \'[\' inside a character class as nesting when detecting unterminated groups with the v flag', () => {
        // With the v flag, "[[(]]" is a nested class containing "(", so the group after it is unterminated.
        const token = {
            rgxInterpolation: "[[(]](a"
        };
        expect(resolveRGXToken(token, {currentFlags: 'v'})).toBe('[[(]](a');
    });

    it('does not resolve an interpolation token with an invalid regex string', () => {
        const token = {
            rgxInterpolation: "[[abc"
        };
        expect(() => resolveRGXToken(token)).toThrow(RGXInvalidRegexStringError);
    });

    it('does not propogate groupWrap preference to nested convertible tokens', () => {
        const token = {
            toRgx: () => ["abc", { toRgx: () => /def/ }]
        };
        expect(resolveRGXToken(token, {groupWrap: false})).toBe('abc|(?:def)');
    });

    it('resolves an array of tokens as a union', () => {
        const tokens = ['abc', /def/, { toRgx: () => 'ghi' }];
        expect(resolveRGXToken(tokens)).toBe('(?:abc|def|ghi)');
    });

    it('resolves an array of tokens as a union without group wrapping', () => {
        const tokens = ['abc', /def/, { toRgx: () => 'ghi' }];
        expect(resolveRGXToken(tokens, {groupWrap: false})).toBe('abc|def|ghi');
    });

    it('resolves an array of tokens with duplicates as a union without duplicates', () => {
        const tokens = ['abc', /def/, { toRgx: () => 'ghi' }, 'abc', /def/];
        expect(resolveRGXToken(tokens)).toBe('(?:abc|def|ghi)');
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
        expect(resolveRGXToken(token)).toBe('(?:abc|def)');
    });

    it('resolves an empty array as an empty string', () => {
        expect(resolveRGXToken([])).toBe('');
    });

    it('resolves a single-element array without adding a non-capturing group', () => {
        expect(resolveRGXToken(['abc'])).toBe('abc');
    });
});
describe('flags in effect', () => {
    it('passes the flags in effect to toRgx', () => {
        const toRgx = jest.fn(() => 'a');
        resolveRGXToken({ toRgx }, { currentFlags: 'im' });
        expect(toRgx).toHaveBeenCalledWith('im');
    });

    it('keeps the localizable flags of the pattern inside class tokens', () => {
        const tokens = [
            rgxGroup({}, ['x']),
            rgxRepeat('x', 2),
            new RGXClassUnionToken(['x', 'y']),
            rgxGroup({ capturing: false }, [rgxLookahead(['x']), 'x']),
            new RGXGroupToken({ capturing: false }, ['x'])
        ];

        for (const token of tokens) {
            const regex = rgxa(['a', token], 'i');
            expect(regex.test('AXX')).toBe(true);
            // Nothing is added to the pattern to keep them.
            expect(regex.source).not.toContain('(?-');
        }

        expect(rgxa([rgxGroup({}, [rgxInterpolation('^'), 'b'])], 'm').test('a\nb')).toBe(true);
    });

    it('resolves literal tokens inside class tokens against the flags in effect', () => {
        // A literal token keeps its own flags wherever it is placed.
        expect(rgxa([rgxGroup({}, [/x/])], 'i').test('X')).toBe(false);
        expect(rgxa([rgxGroup({ flags: 'i' }, [/x/])]).test('X')).toBe(false);
        expect(rgxa([rgxGroup({}, [/x/i])]).test('X')).toBe(true);
        // A literal token with the same flags as the pattern adds nothing.
        expect(rgxa([rgxRepeat(/x/i, 2)], 'i').source).toBe('x{2}');
    });

    it('resolves the contents of groups with flags against the group\'s flags', () => {
        expect(rgxa([rgxGroup({ capturing: false, flags: 'i' }, [/x/i])]).source).toBe('(?i:x)');
    });

    it('checks each token with the u and v flags in effect', () => {
        const setOperation = new RegExp('[\\p{L}--[a-z]]', 'v');
        const regex = rgxa([rgxRepeat(setOperation, 2)], 'v');
        expect(regex.test('éé')).toBe(true);
        expect(regex.test('ab')).toBe(false);
        expect(() => rgxa([rgxGroup({}, [setOperation])], 'v')).not.toThrow();
    });

    it('accepts tokens that are only invalid on their own with the u flag', () => {
        // The backreference refers to a group outside of the subpattern token.
        const regex = rgxa([rgxGroup({}, ['a']), new RGXSubpatternToken(1)], 'u');
        expect(regex.test('aa')).toBe(true);
    });

    it('accepts strings containing "-" with the u and v flags', () => {
        expect(rgxa(['a-b'], 'u').test('a-b')).toBe(true);
        expect(rgxa(['a-b'], 'v').test('a-b')).toBe(true);
    });
});
