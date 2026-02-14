import rgx, { rgxa, rgxConcat, RGXInvalidVanillaRegexFlagsError } from 'src/index';

function expectRegexpEqual(received: RegExp, expected: RegExp | string) {
    const expectedPattern = typeof expected === 'string' ? expected : expected.source;
    expect(received.source).toBe(expectedPattern);
}

describe('rgx', () => {
    it('constructs a RegExp from input with string tokens', () => {
        const regex1 = rgx()`foo${'bar'}baz`;
        const regex2 = rgxa(['foo', 'bar', 'baz']);

        expectRegexpEqual(regex1, 'foobarbaz');
        expectRegexpEqual(regex2, 'foobarbaz');
    });

    it('constructs a RegExp from input with no-op tokens', () => {
        const regex1 = rgx()`foo${null}bar${undefined}bazqux`;
        const regex2 = rgxa(['foo', null, 'bar', undefined, 'bazqux']);

        expectRegexpEqual(regex1, 'foobarbazqux');
        expectRegexpEqual(regex2, 'foobarbazqux');
    });

    it('constructs a RegExp from input with convertible tokens', () => {
        const token1 = { toRgx: () => 'bar' };
        const token2 = { toRgx: () => null };

        const regex1 = rgx()`foo${token1}${token2}`;
        const regex2 = rgxa(['foo', token1, token2]);

        expectRegexpEqual(regex1, 'foobar');
        expectRegexpEqual(regex2, 'foobar');
    });

    it('constructs a RegExp from input with mixed tokens', () => {
        const token1 = { toRgx: () => 'bar' };
        const token2 = { toRgx: () => null };

        const regex1 = rgx()`foo${null}${token1}quux${undefined}${token2}${/\d/}corge`;
        const regex2 = rgxa(['foo', null, token1, 'quux', undefined, token2, /\d/, 'corge']);

        expectRegexpEqual(regex1, 'foobarquux(?:\\d)corge');
        expectRegexpEqual(regex2, 'foobarquux(?:\\d)corge');
    });

    it('constructs a RegExp from input with array tokens interpreted as unions', () => {
        const regex1 = rgx()`foo${['bar', 'baz']}qux`;
        const regex2 = rgxa(['foo', ['bar', 'baz'], 'qux']);

        expectRegexpEqual(regex1, 'foo(?:bar|baz)qux');
        expectRegexpEqual(regex2, 'foo(?:bar|baz)qux');
    });

    it('constructs a RegExp from input with nested array tokens interpreted as unions', () => {
        const regex1 = rgx()`foo${[['bar', 'baz'], 'qux']}corge`;
        const regex2 = rgxa(['foo', [['bar', 'baz'], 'qux'], 'corge']);

        expectRegexpEqual(regex1, 'foo(?:(?:bar|baz)|qux)corge');
        expectRegexpEqual(regex2, 'foo(?:(?:bar|baz)|qux)corge');
    });

    it('constructs a RegExp from input with no tokens', () => {
        const regex1 = rgx()`foobarbaz`;
        const regex2 = rgxa(['foobarbaz']);

        expectRegexpEqual(regex1, 'foobarbaz');
        expectRegexpEqual(regex2, 'foobarbaz');
    });

    it('converts booleans correctly', () => {
        const regex1True = rgx()`${true}`;
        const regex1False = rgx()`${false}`;
        const regex2True = rgxa([true]);
        const regex2False = rgxa([false]);

        expectRegexpEqual(regex1True, 'true');
        expectRegexpEqual(regex1False, 'false');
        expectRegexpEqual(regex2True, 'true');
        expectRegexpEqual(regex2False, 'false');
    });

    it('constructs an empty RegExp from empty input', () => {
        const regex1 = rgx()``;
        const regex2 = rgxa([]);

        expectRegexpEqual(regex1, '(?:)'); // An empty non-capturing group
        expectRegexpEqual(regex2, '(?:)'); // An empty non-capturing group
    });

    it('constructs an empty RegExp from input with only no-op tokens', () => {
        const regex1 = rgx()`${null}${undefined}`;
        const regex2 = rgxa([null, undefined]);

        expectRegexpEqual(regex1, '(?:)'); // An empty non-capturing group
        expectRegexpEqual(regex2, '(?:)'); // An empty non-capturing group
    });

    it('considers empty arrays as no-op tokens', () => {
        const regex1 = rgx()`foo${[]}bar`;
        const regex2 = rgxa(['foo', [], 'bar']);

        expectRegexpEqual(regex1, 'foobar');
        expectRegexpEqual(regex2, 'foobar');
    });

    it('handles arrays with a single element without adding unnecessary non-capturing groups', () => {
        const regex1 = rgx()`foo${['bar']}baz`;
        const regex2 = rgxa(['foo', ['bar'], 'baz']);

        expectRegexpEqual(regex1, 'foobarbaz');
        expectRegexpEqual(regex2, 'foobarbaz');
    });

    it('handles deeply nested empty arrays as no-op tokens', () => {
        const regex1 = rgx()`foo${[[[[[]]]]]}bar`;
        const regex2 = rgxa(['foo', [[[[[]]]]], 'bar']);

        expectRegexpEqual(regex1, 'foobar');
        expectRegexpEqual(regex2, 'foobar');
    });

    it('handles deeply nested arrays with a single element correctly', () => {
        const regex1 = rgx()`foo${[[[['bar']]]]}baz`;
        const regex2 = rgxa(['foo', [[[['bar']]]], 'baz']);

        expectRegexpEqual(regex1, 'foobarbaz');
        expectRegexpEqual(regex2, 'foobarbaz');
    });

    it('handles deeply nested arrays with multiple elements correctly', () => {
        const regex1 = rgx()`foo${[[['bar', 'baz']]]}qux`;
        const regex2 = rgxa(['foo', [[['bar', 'baz']]], 'qux']);

        expectRegexpEqual(regex1, 'foo(?:bar|baz)qux');
        expectRegexpEqual(regex2, 'foo(?:bar|baz)qux');
    });

    it('handles RegExp objects as literal tokens', () => {
        const regex1 = rgx()`foo${/\d/}baz`;
        const regex2 = rgxa(['foo', /\d/, 'baz']);

        expectRegexpEqual(regex1, 'foo(?:\\d)baz');
        expectRegexpEqual(regex2, 'foo(?:\\d)baz');
    });

    it('handles arrays wrapped with rgxConcat and unwrapped arrays differently', () => {
        const regex1Union = rgx()`foo${['bar', 'baz']}qux`;
        const regex1Concat = rgx()`foo${rgxConcat(['bar', 'baz'])}qux`;
        const regex2Union = rgxa(['foo', ['bar', 'baz'], 'qux']);
        const regex2Concat = rgxa(['foo', rgxConcat(['bar', 'baz']), 'qux']);

        expectRegexpEqual(regex1Union, 'foo(?:bar|baz)qux');
        expectRegexpEqual(regex1Concat, 'foobarbazqux');
        expectRegexpEqual(regex2Union, 'foo(?:bar|baz)qux');
        expectRegexpEqual(regex2Concat, 'foobarbazqux');
    });

    it('Applies valid flags correctly', () => {
        const regex1 = rgx('gi')`foo${'bar'}baz`;
        const regex2 = rgxa(['foo', 'bar', 'baz'], 'gi');

        expect(regex1.flags).toContain('g');
        expect(regex1.flags).toContain('i');
        expect(regex2.flags).toContain('g');
        expect(regex2.flags).toContain('i');
    });

    it('Throws the correct error for invalid flags', () => {
        expect(() => rgx('invalid')`foo`).toThrow(RGXInvalidVanillaRegexFlagsError);
        expect(() => rgxa(['foo'], 'invalid')).toThrow(RGXInvalidVanillaRegexFlagsError);
    });
});