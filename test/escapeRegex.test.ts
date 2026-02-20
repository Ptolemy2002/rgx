import {escapeRegex} from 'src/index';

describe('escapeRegex', () => {
    it('escapes special regex characters', () => {
        const input = '-^$.*+?^${}()|[]\\';
        const expected = '\\-\\^\\$\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\';
        expect(escapeRegex(input)).toBe(expected);
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