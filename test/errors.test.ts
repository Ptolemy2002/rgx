import { RGXError, RGXInvalidTokenError, RGXInvalidRegexStringError, RGXInvalidVanillaRegexFlagsError, RGXNotImplementedError, RGXClassToken, RGXInvalidIdentifierError } from 'src/index';

class TestClassToken extends RGXClassToken {
    toRgx() {
        return "test";
    }
}

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

    it('is an instance of Error', () => {
        const error = new RGXError('An error occurred');
        expect(error).toBeInstanceOf(Error);
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

    it('exposes the got property', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'tokenType', values: ['literal'] }, 123);
        expect(error.got).toBe(123);
    });

    it('exposes the expected property', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'tokenType', values: ['literal'] }, 123);
        expect(error.expected).toBe('[RegExp]');
    });

    it('is an instance of RGXError', () => {
        const error = new RGXInvalidTokenError('Invalid token', null, 123);
        expect(error).toBeInstanceOf(RGXError);
    });

    it('formats the error message correctly with expected value of "no-op"', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'tokenType', values: ['no-op'] }, 123);
        expect(error.toString()).toBe('RGXInvalidTokenError: Invalid token; Expected: [null or undefined]; Got: [123]');
    });

    it('formats the error message correctly with expected value of "literal"', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'tokenType', values: ['literal'] }, 123);
        expect(error.toString()).toBe('RGXInvalidTokenError: Invalid token; Expected: [RegExp]; Got: [123]');
    });

    it('formats the error message correctly with expected value of "native"', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'tokenType', values: ['native'] }, 123);
        expect(error.toString()).toBe('RGXInvalidTokenError: Invalid token; Expected: [string, number, boolean, null, or undefined]; Got: [123]');
    });

    it('formats the error message correctly with expected value of "convertible"', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'tokenType', values: ['convertible'] }, 123);
        expect(error.toString()).toBe('RGXInvalidTokenError: Invalid token; Expected: [object with a toRgx method that returns a valid native/literal token or an array of valid native/literal tokens]; Got: [123]');
    });

    it('formats the error message correctly with expected value of "array"', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'tokenType', values: ['array'] }, 123);
        expect(error.toString()).toBe('RGXInvalidTokenError: Invalid token; Expected: [array of native/literal/convertible tokens]; Got: [123]');
    });

    it('formats the error message correctly with expected value of "class"', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'tokenType', values: ['class'] }, 123);
        expect(error.toString()).toBe('RGXInvalidTokenError: Invalid token; Expected: [instance of RGXClassToken]; Got: [123]');
    });

    it('formats the error message correctly with expected value of multiple token types', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'tokenType', values: ['literal', 'native'] }, 123);
        expect(error.toString()).toBe('RGXInvalidTokenError: Invalid token; Expected: [RegExp, string, number, boolean, null, or undefined]; Got: [123]');
    });

    it('formats the error message correctly with custom expected values', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'custom', values: ['a string', 'a number'] }, 123);
        expect(error.toString()).toBe('RGXInvalidTokenError: Invalid token; Expected: [a string or a number]; Got: [123]');
    });

    it('formats the error message correctly with a got value that is an instance of a RGXClassToken', () => {
        const error = new RGXInvalidTokenError('Invalid token', { type: 'custom', values: ['a string'] }, new TestClassToken());
        expect(error.toString()).toBe('RGXInvalidTokenError: Invalid token; Expected: [a string]; Got: [instance of TestClassToken]');
    });

    it('formats the error message correctly with default expected value when expected is null', () => {
        const error = new RGXInvalidTokenError('Invalid token', null, 123);
        expect(error.toString()).toBe(
            'RGXInvalidTokenError: Invalid token; Expected: '
            + '[null, undefined, RegExp, string, number, boolean,'
            + ' object with a toRgx method that returns a valid native/literal token or an array of valid native/literal tokens,'
            + ' array of native/literal/convertible tokens,'
            + ' or instance of RGXClassToken]; Got: [123]'
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

    it('exposes the got property', () => {
        const error = new RGXInvalidRegexStringError('Invalid regex string', 'abc[');
        expect(error.got).toBe('abc[');
    });

    it('is an instance of RGXError', () => {
        const error = new RGXInvalidRegexStringError('Invalid regex string', 'abc[');
        expect(error).toBeInstanceOf(RGXError);
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

    it('exposes the got property', () => {
        const error = new RGXInvalidVanillaRegexFlagsError('Invalid vanilla regex flags', 'gg');
        expect(error.got).toBe('gg');
    });

    it('is an instance of RGXError', () => {
        const error = new RGXInvalidVanillaRegexFlagsError('Invalid vanilla regex flags', 'gg');
        expect(error).toBeInstanceOf(RGXError);
    });

    it('formats the error message correctly', () => {
        const error = new RGXInvalidVanillaRegexFlagsError('Invalid vanilla regex flags', 'gg');
        expect(error.toString()).toBe('RGXInvalidVanillaRegexFlagsError: Invalid vanilla regex flags; Got: "gg"');
    });
});

describe('RGXNotImplementedError', () => {
    it('has the correct name', () => {
        const error = new RGXNotImplementedError('Some functionality');
        expect(error.name).toBe('RGXNotImplementedError');
    });

    it('has the correct code', () => {
        const error = new RGXNotImplementedError('Some functionality');
        expect(error.code).toBe('NOT_IMPLEMENTED');
    });

    it('exposes the functionality property', () => {
        const error = new RGXNotImplementedError('Some functionality');
        expect(error.functionality).toBe('Some functionality');
    });

    it('is an instance of RGXError', () => {
        const error = new RGXNotImplementedError('Some functionality');
        expect(error).toBeInstanceOf(RGXError);
    });

    it('formats the error message correctly without additional info', () => {
        const error = new RGXNotImplementedError('Some functionality');
        expect(error.toString()).toBe('RGXNotImplementedError: Some functionality is not implemented yet.');
    });

    it('formats the error message correctly with additional info', () => {
        const error = new RGXNotImplementedError('Some functionality', 'This will be implemented in the future.');
        expect(error.toString()).toBe(
            'RGXNotImplementedError: Some functionality is not implemented yet. Additional info: This will be implemented in the future.'
        );
    });
});

describe('RGXInvalidIdentifierError', () => {
    it('has the correct name', () => {
        const error = new RGXInvalidIdentifierError('Invalid identifier', '123abc');
        expect(error.name).toBe('RGXInvalidIdentifierError');
    });

    it('has the correct code', () => {
        const error = new RGXInvalidIdentifierError('Invalid identifier', '123abc');
        expect(error.code).toBe('INVALID_IDENTIFIER');
    });

    it('exposes the got property', () => {
        const error = new RGXInvalidIdentifierError('Invalid identifier', '123abc');
        expect(error.got).toBe('123abc');
    });

    it('is an instance of RGXError', () => {
        const error = new RGXInvalidIdentifierError('Invalid identifier', '123abc');
        expect(error).toBeInstanceOf(RGXError);
    });

    it('formats the error message correctly', () => {
        const error = new RGXInvalidIdentifierError('Invalid identifier', '123abc');
        expect(error.toString()).toBe('RGXInvalidIdentifierError: Invalid identifier; Got: "123abc"');
    });
});