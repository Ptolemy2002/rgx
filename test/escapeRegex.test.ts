import {escapeRegex} from 'src/index';

describe('escapeRegex', () => {
    it('escapes special regex characters', () => {
        const input = '-^$.*+?^${}()|[]\\';
        const expected = '\\x2d\\^\\$\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\';
        expect(escapeRegex(input)).toBe(expected);
    });

    it('escapes "-" in a way that is valid with any flags, inside or outside a character class', () => {
        const escaped = escapeRegex('a-z');
        for (const flags of ['', 'u', 'v']) {
            expect(new RegExp(escaped, flags).test('a-z')).toBe(true);

            // Inside a character class, it is a literal "-" rather than a range.
            const charClass = new RegExp(`^[${escaped}]$`, flags);
            expect(charClass.test('-')).toBe(true);
            expect(charClass.test('b')).toBe(false);
        }
    });

    it('does not escape non-special characters', () => {
        const input = 'abc123';
        const expected = 'abc123';
        expect(escapeRegex(input)).toBe(expected);
    });

    it('returns an empty string when given an empty string', () => {
        expect(escapeRegex('')).toBe('');
    });

    it('escapes special characters mixed with non-special characters', () => {
        const input = 'hello.world (test)';
        const expected = 'hello\\.world \\(test\\)';
        expect(escapeRegex(input)).toBe(expected);
    });
});