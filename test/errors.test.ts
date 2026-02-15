import { RGXError, RGXInvalidTokenError, RGXInvalidRegexStringError, RGXInvalidVanillaRegexFlagsError } from 'src/index';

describe('RGXError', () => {
    it('sets the message and code correctly', () => {
        const error = new RGXError('An error occurred', 'UNKNOWN');
        expect(error.message).toBe('An error occurred');
        expect(error.code).toBe('UNKNOWN');
    });

    it('defaults code to UNKNOWN if not provided', () => {
        const error = new RGXError('An error occurred');
        expect(error.code).toBe('UNKNOWN');
    });

    it('has the correct name', () => {
        const error = new RGXError('An error occurred');
        expect(error.name).toBe('RGXError');
    });

    it('formats the error message correctly', () => {
        const error = new RGXError('An error occurred', 'UNKNOWN');
        expect(error.toString()).toBe('RGXError: An error occurred');
    });
});

describe('RGXInvalidTokenError', () => {
    it('has the correct name', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'tokenType', values: ['literal'] }, 123);
        expect(error.name).toBe('RGXInvalidTokenError');
    });

    it('has the correct code', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'tokenType', values: ['literal'] }, 123);
        expect(error.code).toBe('INVALID_RGX_TOKEN');
    });

    it('formats the error message correctly with expected value of "literal"', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'tokenType', values: ['literal'] }, 123);
        expect(error.toString()).toBe('RGXInvalidTokenError: Invalid token; Expected: [RegExp]; Got: 123');
    });

    it('formats the error message correctly with expected value of "native"', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'tokenType', values: ['native'] }, 123);
        expect(error.toString()).toBe('RGXInvalidTokenError: Invalid token; Expected: [string, number, boolean, null, or undefined]; Got: 123');
    });

    it('formats the error message correctly with expected value of "convertible"', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'tokenType', values: ['convertible'] }, 123);
        expect(error.toString()).toBe('RGXInvalidTokenError: Invalid token; Expected: [object with a toRgx method that returns a valid token]; Got: 123');
    });

    it('formats the error message correctly with expected value of "array"', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'tokenType', values: ['array'] }, 123);
        expect(error.toString()).toBe('RGXInvalidTokenError: Invalid token; Expected: [array of native/literal tokens]; Got: 123');
    });

    it('formats the error message correctly with expected value of multiple token types', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'tokenType', values: ['literal', 'native'] }, 123);
        expect(error.toString()).toBe('RGXInvalidTokenError: Invalid token; Expected: [RegExp, string, number, boolean, null, or undefined]; Got: 123');
    });

    it('formats the error message correctly with custom expected values', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'custom', values: ['a string', 'a number'] }, 123);
        expect(error.toString()).toBe('RGXInvalidTokenError: Invalid token; Expected: [a string or a number]; Got: 123');
    });

    it('formats the error message correctly with default expected value when expected is null', () => {
        const error = new RGXInvalidTokenError('Invalid token', null, 123);
        expect(error.toString()).toBe(
            'RGXInvalidTokenError: Invalid token; Expected: '
            + '[null, undefined, RegExp, string, number, boolean,'
            + ' object with a toRgx method that returns a valid token,'
            + ' or array of native/literal tokens]; Got: 123'
        );
    });
});

describe('RGXInvalidRegexStringError', () => {
    it('has the correct name', () => {
        const error = new RGXInvalidRegexStringError('Invalid regex string', 'abc[');
        expect(error.name).toBe('RGXInvalidRegexStringError');
    });

    it('has the correct code', () => {
        const error = new RGXInvalidRegexStringError('Invalid regex string', 'abc[');
        expect(error.code).toBe('INVALID_REGEX_STRING');
    });

    it('formats the error message correctly', () => {
        const error = new RGXInvalidRegexStringError('Invalid regex string', 'abc[');
        expect(error.toString()).toBe('RGXInvalidRegexStringError: Invalid regex string; Got: "abc["');
    });
});

describe('RGXInvalidVanillaRegexFlagsError', () => {
    it('has the correct name', () => {
        const error = new RGXInvalidVanillaRegexFlagsError('Invalid vanilla regex flags', 'gg');
        expect(error.name).toBe('RGXInvalidVanillaRegexFlagsError');
    });

    it('has the correct code', () => {
        const error = new RGXInvalidVanillaRegexFlagsError('Invalid vanilla regex flags', 'gg');
        expect(error.code).toBe('INVALID_VANILLA_REGEX_FLAGS');
    });

    it('formats the error message correctly', () => {
        const error = new RGXInvalidVanillaRegexFlagsError('Invalid vanilla regex flags', 'gg');
        expect(error.toString()).toBe('RGXInvalidVanillaRegexFlagsError: Invalid vanilla regex flags; Got: "gg"');
    });
});