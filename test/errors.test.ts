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
        const error = new RGXInvalidTokenError('Invalid token', 'string', 123);
        expect(error.name).toBe('RGXInvalidTokenError');
    });

    it('has the correct code', () => {
        const error = new RGXInvalidTokenError('Invalid token', 'string', 123);
        expect(error.code).toBe('INVALID_RGX_TOKEN');
    });

    it('formats the error message correctly with expected value', () => {
        const error = new RGXInvalidTokenError('Invalid token', 'string', 123);
        expect(error.toString()).toBe('RGXInvalidTokenError: Invalid token; Expected: [string]; Got: 123');
    });

    it('formats the error message correctly with default expected value when expected is null', () => {
        const error = new RGXInvalidTokenError('Invalid token', null, 123);
        expect(error.toString()).toBe(
            'RGXInvalidTokenError: Invalid token; Expected: '
            + '[null, undefined, string, number, boolean, RegExp, convertible object, or array of native/literal tokens]; Got: 123'
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