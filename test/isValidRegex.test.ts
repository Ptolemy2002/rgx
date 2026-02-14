import { isValidRegexString, assertValidRegexString, escapeRegex, RGXInvalidRegexStringError } from "src/index";

describe('isValidRegex', () => {
    it('accepts strings with no special characters', () => {
        expect(isValidRegexString('foobar')).toBe(true);
        expect(() => assertValidRegexString('foobar')).not.toThrow();
    });

    it('accepts strings with escaped special characters', () => {
        expect(isValidRegexString('foo\\*bar')).toBe(true);
        expect(() => assertValidRegexString('foo\\*bar')).not.toThrow();
    });

    it('accepts strings with unescaped special characters compatible with regex syntax', () => {
        expect(isValidRegexString('foo[bar]')).toBe(true);
        expect(() => assertValidRegexString('foo[bar]')).not.toThrow();
    });

    it('accepts empty string', () => {
        expect(isValidRegexString('')).toBe(true);
        expect(() => assertValidRegexString('')).not.toThrow();
    });

    it('accepts complex valid regex patterns', () => {
        expect(isValidRegexString('^(foo|bar)*\\d{3,5}$')).toBe(true);
        expect(() => assertValidRegexString('^(foo|bar)*\\d{3,5}$')).not.toThrow();
    });

    it('accepts string with invalid regex syntax after passing through escapeRegex', () => {
        const specialString = 'foo.*+?^${}()|[]\\bar';
        const escapedString = escapeRegex(specialString);
        expect(isValidRegexString(escapedString)).toBe(true);
        expect(() => assertValidRegexString(escapedString)).not.toThrow();
    });

    it('rejects strings with unescaped unclosed parenthesis', () => {
        expect(isValidRegexString('foo(bar')).toBe(false);
        expect(() => assertValidRegexString('foo(bar')).toThrow(RGXInvalidRegexStringError);
    });

    it('rejects strings with unescaped unclosed brackets', () => {
        expect(isValidRegexString('foo[bar')).toBe(false);
        expect(() => assertValidRegexString('foo[bar')).toThrow(RGXInvalidRegexStringError);
    });

    it('rejects strings with invalid quantifier usage', () => {
        expect(isValidRegexString('foo{3,2}bar')).toBe(false);
        expect(() => assertValidRegexString('foo{3,2}bar')).toThrow(RGXInvalidRegexStringError);
    });
});