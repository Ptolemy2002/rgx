import rgx, { rgxa, RGXClassToken, rgxConcat, RGXInsertionRejectedError, RGXInvalidRegexFlagsError, RGXToken, RGXTokenCollection, ValidRegexFlags } from 'src/index';
import { expectError } from './utils';

function expectRegexpEqual(received: RegExp, expected: RegExp | string) {
    const expectedPattern = typeof expected === 'string' ? expected : expected.source;
    expect(received.source).toBe(expectedPattern);
}

class TestClassToken1 extends RGXClassToken {
    rgxAcceptInsertion() {
        return false;
    }

    toRgx(): RGXToken {
        return 'test';
    }

    clone() {
        return new TestClassToken1();
    }
}

class TestClassToken2 extends RGXClassToken {
    rgxAcceptInsertion() {
        return "class: always rejects";
    }

    toRgx(): RGXToken {
        return 'test';
    }

    clone() {
        return new TestClassToken1();
    }
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

    it('creates inline modifier groups when a RegExp literal adds localizable flags', () => {
        const regex1 = rgx()`foo${/bar/i}baz`;
        const regex2 = rgxa(['foo', /bar/i, 'baz']);

        expectRegexpEqual(regex1, 'foo(?i:bar)baz');
        expectRegexpEqual(regex2, 'foo(?i:bar)baz');
    });

    it('creates inline modifier groups that remove flags when a RegExp literal lacks parent flags', () => {
        const regex1 = rgx('i')`foo${/bar/}baz`;
        const regex2 = rgxa(['foo', /bar/, 'baz'], 'i');

        expectRegexpEqual(regex1, 'foo(?-i:bar)baz');
        expectRegexpEqual(regex2, 'foo(?-i:bar)baz');
    });

    it('does not create inline modifier groups when localizable flags match', () => {
        const regex1 = rgx('i')`foo${/bar/i}baz`;
        const regex2 = rgxa(['foo', /bar/i, 'baz'], 'i');

        expectRegexpEqual(regex1, 'foo(?:bar)baz');
        expectRegexpEqual(regex2, 'foo(?:bar)baz');
    });

    it('creates inline modifier groups with both added and removed flags', () => {
        const regex1 = rgx('i')`foo${/bar/ms}baz`;
        const regex2 = rgxa(['foo', /bar/ms, 'baz'], 'i');

        expectRegexpEqual(regex1, 'foo(?ms-i:bar)baz');
        expectRegexpEqual(regex2, 'foo(?ms-i:bar)baz');
    });

    it('ignores non-localizable flags when computing inline modifier groups', () => {
        const regex1 = rgx('gi')`foo${/bar/gi}baz`;
        const regex2 = rgxa(['foo', /bar/gi, 'baz'], 'gi');

        // g is non-localizable and i matches on both sides, so no modifier needed
        expectRegexpEqual(regex1, 'foo(?:bar)baz');
        expectRegexpEqual(regex2, 'foo(?:bar)baz');
    });

    it('creates separate inline modifier groups for multiple RegExp literals', () => {
        const regex1 = rgx()`${/foo/i}${/bar/m}`;
        const regex2 = rgxa([/foo/i, /bar/m]);

        expectRegexpEqual(regex1, '(?i:foo)(?m:bar)');
        expectRegexpEqual(regex2, '(?i:foo)(?m:bar)');
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
        expect(() => rgx('invalid')`foo`).toThrow(RGXInvalidRegexFlagsError);
        expect(() => rgxa(['foo'], 'invalid')).toThrow(RGXInvalidRegexFlagsError);
    });

    it('Throws the correct error for a convertible token that rejects insertion', () => {
        const token = { toRgx: () => "foo", rgxAcceptInsertion: () => false };

        expect(() => rgx()`bar${token}baz`).toThrow(RGXInsertionRejectedError);
        expect(() => rgxa(['bar', token, 'baz'])).toThrow(RGXInsertionRejectedError);
    });

    it('Throws the correct error for a convertible token that rejects insertion with a message', () => {
        const token = { toRgx: () => "foo", rgxAcceptInsertion: () => "Always rejects" };

        expect(() => rgx()`bar${token}baz`).toThrow(RGXInsertionRejectedError);
        expect(() => rgxa(['bar', token, 'baz'])).toThrow(RGXInsertionRejectedError);
    });

    it('Handles an RGXTokenCollection in union mode correctly', () => {
        const collection = new RGXTokenCollection(['foo', 'bar', 'baz'], "union");
        const regex1 = rgx()`qux${collection}quux`;
        const regex2 = rgxa(['qux', collection, 'quux']);

        expectRegexpEqual(regex1, 'qux(?:foo|bar|baz)quux');
        expectRegexpEqual(regex2, 'qux(?:foo|bar|baz)quux');
    });

    it('Handles an RGXTokenCollection in concat mode correctly', () => {
        const collection = new RGXTokenCollection(['foo', 'bar', 'baz'], "concat");
        const regex1 = rgx()`qux${collection}quux`;
        const regex2 = rgxa(['qux', collection, 'quux']);

        expectRegexpEqual(regex1, 'qux(?:foobarbaz)quux');
        expectRegexpEqual(regex2, 'qux(?:foobarbaz)quux');
    });

    it('Removes duplicates from unions', () => {
        const regex1 = rgx()`foo${['bar', 'baz', 'bar', 'qux', 'baz']}quux`;
        const regex2 = rgxa(['foo', ['bar', 'baz', 'bar', 'qux', 'baz'], 'quux']);

        expectRegexpEqual(regex1, 'foo(?:bar|baz|qux)quux');
        expectRegexpEqual(regex2, 'foo(?:bar|baz|qux)quux');
    });

    it('Does not remove duplicates from nested unions', () => {
        const regex1 = rgx()`foo${[['bar', 'baz'], ['bar', 'qux'], 'baz']}quux`;
        const regex2 = rgxa(['foo', [['bar', 'baz'], ['bar', 'qux'], 'baz'], 'quux']);

        expectRegexpEqual(regex1, 'foo(?:(?:bar|baz)|(?:bar|qux)|baz)quux');
        expectRegexpEqual(regex2, 'foo(?:(?:bar|baz)|(?:bar|qux)|baz)quux');
    });

    it('converts numbers correctly', () => {
        const regex1 = rgx()`${42}`;
        const regex2 = rgxa([42]);

        expectRegexpEqual(regex1, '42');
        expectRegexpEqual(regex2, '42');
    });

    it('constructs a RegExp from input with a convertible token returning a RegExp', () => {
        const token = { toRgx: () => /\w+/ };

        const regex1 = rgx()`foo${token}baz`;
        const regex2 = rgxa(['foo', token, 'baz']);

        expectRegexpEqual(regex1, 'foo(?:\\w+)baz');
        expectRegexpEqual(regex2, 'foo(?:\\w+)baz');
    });

    it('constructs a RegExp from input with a convertible token returning an array', () => {
        const token = { toRgx: () => ['bar', 'baz'] };

        const regex1 = rgx()`foo${token}qux`;
        const regex2 = rgxa(['foo', token, 'qux']);

        expectRegexpEqual(regex1, 'foo(?:bar|baz)qux');
        expectRegexpEqual(regex2, 'foo(?:bar|baz)qux');
    });

    it('constructs a RegExp from input with a convertible token returning an array that contains other convertible tokens', () => {
        const token = { toRgx: () => ['bar', 'baz', { toRgx: () => 'qux' }] };

        const regex1 = rgx()`foo${token}quux`;
        const regex2 = rgxa(['foo', token, 'quux']);

        expectRegexpEqual(regex1, 'foo(?:bar|baz|qux)quux');
        expectRegexpEqual(regex2, 'foo(?:bar|baz|qux)quux');
    });

    it('Applies no flags when called without flags argument', () => {
        const regex1 = rgx()`foo`;
        const regex2 = rgxa(['foo']);

        expect(regex1.flags).toBe('');
        expect(regex2.flags).toBe('');
    });
});

describe('rgxConcat', () => {
    it('concatenates an array of tokens into a single regex string', () => {
        const result = rgxConcat([/\d+/, 'abc', /\w/]);
        expect(result).toBe('(?:\\d+)abc(?:\\w)');
    });

    it('passes groupWrap=false through to resolveRGXToken', () => {
        const result = rgxConcat([/\d+/, 'abc', /\w/], false);
        expect(result).toBe('\\d+abc\\w');
    });

    it('creates inline modifier groups based on currentFlags', () => {
        const result = rgxConcat([/foo/, 'bar'], true, 'i');
        expect(result).toBe('(?-i:foo)bar');
    });

    it('creates inline modifier groups even when groupWrap is false', () => {
        const result = rgxConcat([/bar/i], false);
        expect(result).toBe('(?i:bar)');
    });

    it('Throws the correct error for a convertible token that rejects insertion', () => {
        const token = { toRgx: () => "foo", rgxAcceptInsertion: () => false };
        expectError(() => rgxConcat(['bar', token, 'baz']), RGXInsertionRejectedError, (e) => {
            return e.message === "Insertion rejected; Additional info: index 1, token type unknown";
        });
    });

    it('Throws the correct error for a convertible token that rejects insertion with a message', () => {
        const token = { toRgx: () => "foo", rgxAcceptInsertion: () => "Always rejects" };
        expectError(() => rgxConcat(['bar', token, 'baz']), RGXInsertionRejectedError, (e) => {
            return e.message === "Insertion rejected; Reason: Always rejects; Additional info: index 1, token type unknown";
        });
    });

    it('Throws the correct error for a class token that rejects insertion', () => {
        const token = new TestClassToken1();
        expectError(() => rgxConcat(['bar', token, 'baz']), RGXInsertionRejectedError, (e) => {
            return e.message === "Insertion rejected; Additional info: index 1, token type TestClassToken1";
        });
    });

    it('Throws the correct error for a class token that rejects insertion with a message', () => {
        const token = new TestClassToken2();
        expectError(() => rgxConcat(['bar', token, 'baz']), RGXInsertionRejectedError, (e) => {
            return e.message === "Insertion rejected; Reason: class: always rejects; Additional info: index 1, token type TestClassToken2";
        });
    });
});