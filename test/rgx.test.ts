import rgx from 'src/index';

function expectRegexpEqual(received: RegExp, expected: RegExp | string) {
    const expectedPattern = typeof expected === 'string' ? expected : expected.source;
    expect(received.source).toBe(expectedPattern);
}

describe('rgx', () => {
    it('constructs a RegExp from input with string tokens', () => {
        const regex = rgx`foo${'bar'}baz`;
        expectRegexpEqual(regex, 'foobarbaz');
    });

    it('constructs a RegExp from input with no-op tokens', () => {
        const regex = rgx`foo${null}bar${undefined}bazqux`;
        expectRegexpEqual(regex, 'foobarbazqux');
    });

    it('constructs a RegExp from input with convertible tokens', () => {
        const token1 = { toRgx: () => 'bar' };
        const token2 = { toRgx: () => null };
        const regex = rgx`foo${token1}${token2}`;
        expectRegexpEqual(regex, 'foobar');
    });

    it('constructs a RegExp from input with mixed tokens', () => {
        const token1 = { toRgx: () => 'bar' };
        const token2 = { toRgx: () => null };
        const regex = rgx`foo${null}${token1}quux${undefined}${token2}corge`;
        expectRegexpEqual(regex, 'foobarquuxcorge');
    });

    it('constructs a RegExp from input with array tokens interpreted as unions', () => {
        const regex = rgx`foo${['bar', 'baz']}qux`;
        expectRegexpEqual(regex, 'foo(bar|baz)qux');
    });

    it('constructs a RegExp from input with nested array tokens interpreted as unions', () => {
        const regex = rgx`foo${[['bar', 'baz'], 'qux']}corge`;
        expectRegexpEqual(regex, 'foo((bar|baz)|qux)corge');
    });

    it('constructs a RegExp from input with no tokens', () => {
        const regex = rgx`foobarbaz`;
        expectRegexpEqual(regex, 'foobarbaz');
    });

    it('converts booleans correctly', () => {
        const regexTrue = rgx`${true}`;
        const regexFalse = rgx`${false}`;

        expectRegexpEqual(regexTrue, 'true');
        expectRegexpEqual(regexFalse, 'false');
    });

    it('constructs an empty RegExp from empty input', () => {
        const regex = rgx``;
        expectRegexpEqual(regex, '(?:)'); // An empty non-capturing group
    });

    it('constructs an empty RegExp from input with only no-op tokens', () => {
        const regex = rgx`${null}${undefined}`;
        expectRegexpEqual(regex, '(?:)'); // An empty non-capturing group
    });
});