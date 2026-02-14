import rgx, { rgxConcat, RGXInvalidVanillaRegexFlagsError } from 'src/index';

function expectRegexpEqual(received: RegExp, expected: RegExp | string) {
    const expectedPattern = typeof expected === 'string' ? expected : expected.source;
    expect(received.source).toBe(expectedPattern);
}

describe('rgx', () => {
    it('constructs a RegExp from input with string tokens', () => {
        const regex = rgx()`foo${'bar'}baz`;
        expectRegexpEqual(regex, 'foobarbaz');
    });

    it('constructs a RegExp from input with no-op tokens', () => {
        const regex = rgx()`foo${null}bar${undefined}bazqux`;
        expectRegexpEqual(regex, 'foobarbazqux');
    });

    it('constructs a RegExp from input with convertible tokens', () => {
        const token1 = { toRgx: () => 'bar' };
        const token2 = { toRgx: () => null };
        const regex = rgx()`foo${token1}${token2}`;
        expectRegexpEqual(regex, 'foobar');
    });

    it('constructs a RegExp from input with mixed tokens', () => {
        const token1 = { toRgx: () => 'bar' };
        const token2 = { toRgx: () => null };
        const regex = rgx()`foo${null}${token1}quux${undefined}${token2}${/\d/}corge`;
        expectRegexpEqual(regex, 'foobarquux(?:\\d)corge');
    });

    it('constructs a RegExp from input with array tokens interpreted as unions', () => {
        const regex = rgx()`foo${['bar', 'baz']}qux`;
        expectRegexpEqual(regex, 'foo(?:bar|baz)qux');
    });

    it('constructs a RegExp from input with nested array tokens interpreted as unions', () => {
        const regex = rgx()`foo${[['bar', 'baz'], 'qux']}corge`;
        expectRegexpEqual(regex, 'foo(?:(?:bar|baz)|qux)corge');
    });

    it('constructs a RegExp from input with no tokens', () => {
        const regex = rgx()`foobarbaz`;
        expectRegexpEqual(regex, 'foobarbaz');
    });

    it('converts booleans correctly', () => {
        const regexTrue = rgx()`${true}`;
        const regexFalse = rgx()`${false}`;

        expectRegexpEqual(regexTrue, 'true');
        expectRegexpEqual(regexFalse, 'false');
    });

    it('constructs an empty RegExp from empty input', () => {
        const regex = rgx()``;
        expectRegexpEqual(regex, '(?:)'); // An empty non-capturing group
    });

    it('constructs an empty RegExp from input with only no-op tokens', () => {
        const regex = rgx()`${null}${undefined}`;
        expectRegexpEqual(regex, '(?:)'); // An empty non-capturing group
    });

    it('considers empty arrays as no-op tokens', () => {
        const regex = rgx()`foo${[]}bar`;
        expectRegexpEqual(regex, 'foobar');
    });

    it('handles arrays with a single element without adding unnecessary non-capturing groups', () => {
        const regex = rgx()`foo${['bar']}baz`;
        expectRegexpEqual(regex, 'foobarbaz');
    });

    it('handles deeply nested empty arrays as no-op tokens', () => {
        const regex = rgx()`foo${[[[[[]]]]]}bar`;
        expectRegexpEqual(regex, 'foobar');
    });

    it('handles deeply nested arrays with a single element correctly', () => {
        const regex = rgx()`foo${[[[['bar']]]]}baz`;
        expectRegexpEqual(regex, 'foobarbaz');
    });

    it('handles deeply nested arrays with multiple elements correctly', () => {
        const regex = rgx()`foo${[[['bar', 'baz']]]}qux`;
        expectRegexpEqual(regex, 'foo(?:bar|baz)qux');
    });

    it('handles RegExp objects as literal tokens', () => {
        const regex = rgx()`foo${/\d/}baz`;
        expectRegexpEqual(regex, 'foo(?:\\d)baz');
    });

    it('handles arrays wrapped with rgxConcat and unwrapped arrays differently', () => {
        const regexUnion = rgx()`foo${['bar', 'baz']}qux`;
        const regexConcat = rgx()`foo${rgxConcat(['bar', 'baz'])}qux`;

        expectRegexpEqual(regexUnion, 'foo(?:bar|baz)qux');
        expectRegexpEqual(regexConcat, 'foobarbazqux');
    });

    it('Applies valid flags correctly', () => {
        const regex = rgx('gi')`foo${'bar'}baz`;
        expect(regex.flags).toContain('g');
        expect(regex.flags).toContain('i');
    });

    it('Throws the correct error for invalid flags', () => {
        expect(() => rgx('invalid')`foo`).toThrow(RGXInvalidVanillaRegexFlagsError);
    });
});