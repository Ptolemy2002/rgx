import { isValidRegex, escapeRegex } from "src/index";

describe('isValidRegex', () => {
    it('accepts strings with no special characters', () => {
        expect(isValidRegex('foobar')).toBe(true);
    });

    it('accepts strings with escaped special characters', () => {
        expect(isValidRegex('foo\\*bar')).toBe(true);
    });

    it('accepts strings with unescaped special characters compatible with regex syntax', () => {
        expect(isValidRegex('foo[bar]')).toBe(true);
    });

    it('accepts empty string', () => {
        expect(isValidRegex('')).toBe(true);
    });

    it('accepts complex valid regex patterns', () => {
        expect(isValidRegex('^(foo|bar)*\\d{3,5}$')).toBe(true);
    });

    it('accepts string with invalid regex syntax after passing through escapeRegex', () => {
        const specialString = 'foo.*+?^${}()|[]\\bar';
        const escapedString = escapeRegex(specialString);
        expect(isValidRegex(escapedString)).toBe(true);
    });

    it('rejects strings with unescaped unclosed parenthesis', () => {
        expect(isValidRegex('foo(bar')).toBe(false);
    });

    it('rejects strings with unescaped unclosed brackets', () => {
        expect(isValidRegex('foo[bar')).toBe(false);
    });

    it('rejects strings with invalid quantifier usage', () => {
        expect(isValidRegex('foo{3,2}bar')).toBe(false);
    });
});