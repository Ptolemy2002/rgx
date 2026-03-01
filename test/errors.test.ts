import { 
    RGXError, RGXInvalidTokenError, RGXInvalidRegexStringError, RGXInvalidVanillaRegexFlagsError,
    RGXNotImplementedError, RGXClassToken, RGXInvalidIdentifierError, RGXOutOfBoundsError,
    RGXInvalidRegexFlagsError, isInRange, assertInRange, RGXInvalidFlagTransformerKeyError,
    RGXFlagTransformerConflictError, RGXNotSupportedError, RGXInsertionRejectedError,
    RGXConstantConflictError, RGXInvalidConstantKeyError, RGXRegexNotMatchedAtPositionError,
    RGXPartValidationFailedError
} from 'src/index';

class TestClassToken extends RGXClassToken {
    toRgx() {
        return "test";
    }

    clone() {
        return new TestClassToken();
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
        expect(error.expected).toBe('[RegExp or ExtRegExp]');
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
        expect(error.toString()).toBe('RGXInvalidTokenError: Invalid token; Expected: [RegExp or ExtRegExp]; Got: [123]');
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
        expect(error.toString()).toBe('RGXInvalidTokenError: Invalid token; Expected: [RegExp, ExtRegExp, string, number, boolean, null, or undefined]; Got: [123]');
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
            + '[null, undefined, RegExp, ExtRegExp, string, number, boolean,'
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

describe('RGXInvalidRegexFlagsError', () => {
    it('has the correct name', () => {
        const error = new RGXInvalidRegexFlagsError('Invalid regex flags', 'ggx');
        expect(error.name).toBe('RGXInvalidRegexFlagsError');
    });

    it('has the correct code', () => {
        const error = new RGXInvalidRegexFlagsError('Invalid regex flags', 'ggx');
        expect(error.code).toBe('INVALID_REGEX_FLAGS');
    });

    it('exposes the got property', () => {
        const error = new RGXInvalidRegexFlagsError('Invalid regex flags', 'ggx');
        expect(error.got).toBe('ggx');
    });

    it('is an instance of RGXError', () => {
        const error = new RGXInvalidRegexFlagsError('Invalid regex flags', 'ggx');
        expect(error).toBeInstanceOf(RGXError);
    });

    it('formats the error message correctly', () => {
        const error = new RGXInvalidRegexFlagsError('Invalid regex flags', 'ggx');
        expect(error.toString()).toBe('RGXInvalidRegexFlagsError: Invalid regex flags; Got: "ggx"');
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

describe('RGXNotSupportedError', () => {
    it('has the correct name', () => {
        const error = new RGXNotSupportedError('Some functionality');
        expect(error.name).toBe('RGXNotSupportedError');
    });

    it('has the correct code', () => {
        const error = new RGXNotSupportedError('Some functionality');
        expect(error.code).toBe('NOT_SUPPORTED');
    });

    it('exposes the functionality property', () => {
        const error = new RGXNotSupportedError('Some functionality');
        expect(error.functionality).toBe('Some functionality');
    });

    it('is an instance of RGXError', () => {
        const error = new RGXNotSupportedError('Some functionality');
        expect(error).toBeInstanceOf(RGXError);
    });

    it('formats the error message correctly without additional info', () => {
        const error = new RGXNotSupportedError('Some functionality');
        expect(error.toString()).toBe('RGXNotSupportedError: Some functionality is not supported.');
    });

    it('formats the error message correctly with additional info', () => {
        const error = new RGXNotSupportedError('Some functionality', 'This will be supported in the future.');
        expect(error.toString()).toBe(
            'RGXNotSupportedError: Some functionality is not supported. Additional info: This will be supported in the future.'
        );
    });
});

describe('RGXInsertionRejectedError', () => {
    it('has the correct name', () => {
        const error = new RGXInsertionRejectedError('Some reason');
        expect(error.name).toBe('RGXInsertionRejectedError');
    });

    it('has the correct code', () => {
        const error = new RGXInsertionRejectedError('Some reason');
        expect(error.code).toBe('INSERTION_REJECTED');
    });

    it('exposes the reason property', () => {
        const error = new RGXInsertionRejectedError('Some reason');
        expect(error.reason).toBe('Some reason');
    });

    it('is an instance of RGXError', () => {
        const error = new RGXInsertionRejectedError('Some reason');
        expect(error).toBeInstanceOf(RGXError);
    });

    it('formats the error message correctly without additional info', () => {
        const error = new RGXInsertionRejectedError('Some reason');
        expect(error.toString()).toBe('RGXInsertionRejectedError: Insertion rejected; Reason: Some reason');
    });

    it('formats the error message correctly with additional info', () => {
        const error = new RGXInsertionRejectedError('Some reason', 'This will be resolved in the future.');
        expect(error.toString()).toBe(
            'RGXInsertionRejectedError: Insertion rejected; Reason: Some reason; Additional info: This will be resolved in the future.'
        );
    });
    
    it('formats the error message correctly with no reason and no additional info', () => {
        const error = new RGXInsertionRejectedError();
        expect(error.toString()).toBe('RGXInsertionRejectedError: Insertion rejected');
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

describe('RGXInvalidFlagTransformerKeyError', () => {
    it('has the correct name', () => {
        const error = new RGXInvalidFlagTransformerKeyError('Invalid flag transformer key', 'ab');
        expect(error.name).toBe('RGXInvalidFlagTransformerKeyError');
    });

    it('has the correct code', () => {
        const error = new RGXInvalidFlagTransformerKeyError('Invalid flag transformer key', 'ab');
        expect(error.code).toBe('INVALID_FLAG_TRANSFORMER_KEY');
    });

    it('exposes the got property', () => {
        const error = new RGXInvalidFlagTransformerKeyError('Invalid flag transformer key', 'ab');
        expect(error.got).toBe('ab');
    });

    it('is an instance of RGXError', () => {
        const error = new RGXInvalidFlagTransformerKeyError('Invalid flag transformer key', 'ab');
        expect(error).toBeInstanceOf(RGXError);
    });

    it('formats the error message correctly', () => {
        const error = new RGXInvalidFlagTransformerKeyError('Invalid flag transformer key', 'ab');
        expect(error.toString()).toBe('RGXInvalidFlagTransformerKeyError: Invalid flag transformer key; Got: "ab"');
    });
});

describe('RGXInvalidConstantKeyError', () => {
    it('has the correct name', () => {
        const error = new RGXInvalidConstantKeyError('Invalid constant key', 'CONSTANT_NAME');
        expect(error.name).toBe('RGXInvalidConstantKeyError');
    });

    it('has the correct code', () => {
        const error = new RGXInvalidConstantKeyError('Invalid constant key', 'CONSTANT_NAME');
        expect(error.code).toBe('INVALID_CONSTANT_KEY');
    });

    it('exposes the got property', () => {
        const error = new RGXInvalidConstantKeyError('Invalid constant key', 'CONSTANT_NAME');
        expect(error.got).toBe('CONSTANT_NAME');
    });

    it('is an instance of RGXError', () => {
        const error = new RGXInvalidConstantKeyError('Invalid constant key', 'CONSTANT_NAME');
        expect(error).toBeInstanceOf(RGXError);
    });

    it('formats the error message correctly', () => {
        const error = new RGXInvalidConstantKeyError('Invalid constant key', 'CONSTANT_NAME');
        expect(error.toString()).toBe('RGXInvalidConstantKeyError: Invalid constant key; Got: "CONSTANT_NAME"');
    });
});

describe('RGXFlagTransformerConflictError', () => {
    it('has the correct name', () => {
        const error = new RGXFlagTransformerConflictError('Flag transformer conflict', 'g');
        expect(error.name).toBe('RGXFlagTransformerConflictError');
    });

    it('has the correct code', () => {
        const error = new RGXFlagTransformerConflictError('Flag transformer conflict', 'g');
        expect(error.code).toBe('FLAG_TRANSFORMER_CONFLICT');
    });

    it('exposes the got property', () => {
        const error = new RGXFlagTransformerConflictError('Flag transformer conflict', 'g');
        expect(error.got).toBe('g');
    });

    it('is an instance of RGXError', () => {
        const error = new RGXFlagTransformerConflictError('Flag transformer conflict', 'g');
        expect(error).toBeInstanceOf(RGXError);
    });

    it('formats the error message correctly', () => {
        const error = new RGXFlagTransformerConflictError('Flag transformer conflict', 'g');
        expect(error.toString()).toBe('RGXFlagTransformerConflictError: Flag transformer conflict; Got: "g"');
    });
});

describe('RGXConstantConflictError', () => {
    it('has the correct name', () => {
        const error = new RGXConstantConflictError('Constant conflict', 'CONSTANT_NAME');
        expect(error.name).toBe('RGXConstantConflictError');
    });

    it('has the correct code', () => {
        const error = new RGXConstantConflictError('Constant conflict', 'CONSTANT_NAME');
        expect(error.code).toBe('CONSTANT_CONFLICT');
    });

    it('exposes the got property', () => {
        const error = new RGXConstantConflictError('Constant conflict', 'CONSTANT_NAME');
        expect(error.got).toBe('CONSTANT_NAME');
    });

    it('is an instance of RGXError', () => {
        const error = new RGXConstantConflictError('Constant conflict', 'CONSTANT_NAME');
        expect(error).toBeInstanceOf(RGXError);
    });

    it('formats the error message correctly', () => {
        const error = new RGXConstantConflictError('Constant conflict', 'CONSTANT_NAME');
        expect(error.toString()).toBe('RGXConstantConflictError: Constant conflict; Got: "CONSTANT_NAME"');
    });
});

describe('RGXOutOfBoundsError', () => {
    it('has the correct name', () => {
        const error = new RGXOutOfBoundsError('Value out of bounds', 5, { min: 0, max: 10 });
        expect(error.name).toBe('RGXOutOfBoundsError');
    });

    it('has the correct code', () => {
        const error = new RGXOutOfBoundsError('Value out of bounds', 5, { min: 0, max: 10 });
        expect(error.code).toBe('OUT_OF_BOUNDS');
    });

    it('exposes the got property', () => {
        const error = new RGXOutOfBoundsError('Value out of bounds', 5, { min: 0, max: 10 });
        expect(error.got).toBe(5);
    });

    it('exposes the min and max properties', () => {
        const error = new RGXOutOfBoundsError('Value out of bounds', 5, { min: 0, max: 10 });
        expect(error.min).toBe(0);
        expect(error.max).toBe(10);
    });

    it('exposes the inclusiveLeft and inclusiveRight properties', () => {
        const error = new RGXOutOfBoundsError('Value out of bounds', 5, { min: 0, max: 10, inclusiveLeft: false, inclusiveRight: false });
        expect(error.inclusiveLeft).toBe(false);
        expect(error.inclusiveRight).toBe(false);
    });

    it('defaults inclusiveLeft and inclusiveRight to true', () => {
        const error = new RGXOutOfBoundsError('Value out of bounds', 5, { min: 0, max: 10 });
        expect(error.inclusiveLeft).toBe(true);
        expect(error.inclusiveRight).toBe(true);
    });

    it('defaults min and max to null', () => {
        const error = new RGXOutOfBoundsError('Value out of bounds', 5, {});
        expect(error.min).toBeNull();
        expect(error.max).toBeNull();
    });

    it('defaults to no bounds and inclusive on both sides when options object is not provided', () => {
        const error = new RGXOutOfBoundsError('Value out of bounds', 5);
        expect(error.min).toBeNull();
        expect(error.max).toBeNull();
        expect(error.inclusiveLeft).toBe(true);
        expect(error.inclusiveRight).toBe(true);
    });

    it('clamps max to min if min is set to a value greater than the current max', () => {
        const error = new RGXOutOfBoundsError('Value out of bounds', 5, { min: 0, max: 10 });
        error.min = 15;
        expect(error.min).toBe(15);
        expect(error.max).toBe(15);
    });

    it('clamps min to max if max is set to a value less than the current min', () => {
        const error = new RGXOutOfBoundsError('Value out of bounds', 5, { min: 0, max: 10 });
        error.max = -5;
        expect(error.max).toBe(-5);
        expect(error.min).toBe(-5);
    });

    it('is an instance of RGXError', () => {
        const error = new RGXOutOfBoundsError('Value out of bounds', 5, { min: 0, max: 10 });
        expect(error).toBeInstanceOf(RGXError);
    });

    it('formats the error message correctly with no failure', () => {
        const error = new RGXOutOfBoundsError('Value out of bounds', 5, { min: 0, max: 10 });
        expect(error.toString()).toBe('RGXOutOfBoundsError: Value out of bounds; Got: [5]; Expected: [>= 0 and <= 10]');
    });

    it('formats the error message correctly with failure at min', () => {
        const error1 = new RGXOutOfBoundsError('Value out of bounds', 0, { min: 0, max: 10, inclusiveLeft: false });
        expect(error1.toString()).toBe('RGXOutOfBoundsError: Value out of bounds; Got: [0]; Expected: [> 0 and <= 10]; 0 == 0');

        const error2 = new RGXOutOfBoundsError('Value out of bounds', -1, { min: 0, max: 10, inclusiveLeft: false });
        expect(error2.toString()).toBe('RGXOutOfBoundsError: Value out of bounds; Got: [-1]; Expected: [> 0 and <= 10]; -1 < 0');
    });

    it('formats the error message correctly with failure at max', () => {
        const error1 = new RGXOutOfBoundsError('Value out of bounds', 10, { min: 0, max: 10, inclusiveRight: false });
        expect(error1.toString()).toBe('RGXOutOfBoundsError: Value out of bounds; Got: [10]; Expected: [>= 0 and < 10]; 10 == 10');

        const error2 = new RGXOutOfBoundsError('Value out of bounds', 11, { min: 0, max: 10, inclusiveRight: false });
        expect(error2.toString()).toBe('RGXOutOfBoundsError: Value out of bounds; Got: [11]; Expected: [>= 0 and < 10]; 11 > 10');
    });
});

describe('isInRange', () => {
    it('always accepts a value when no min or max is specified', () => {
        expect(isInRange(5)).toBe(true);
        expect(isInRange(-100)).toBe(true);
        expect(isInRange(100)).toBe(true);

        expect(() => assertInRange(5)).not.toThrow();
        expect(() => assertInRange(-100)).not.toThrow();
        expect(() => assertInRange(100)).not.toThrow();
    });

    it('always accepts a value in between the min and max', () => {
        expect(isInRange(5, { min: 0, max: 10 })).toBe(true);
        expect(isInRange(0.5, { min: 0, max: 1 })).toBe(true);
        expect(isInRange(-5, { min: -10, max: 0 })).toBe(true);

        expect(() => assertInRange(5, { min: 0, max: 10 })).not.toThrow();
        expect(() => assertInRange(0.5, { min: 0, max: 1 })).not.toThrow();
        expect(() => assertInRange(-5, { min: -10, max: 0 })).not.toThrow();
    });

    it('always rejects a value less than the min', () => {
        expect(isInRange(-1, { min: 0, max: 10 })).toBe(false);
        expect(isInRange(-0.1, { min: 0, max: 1 })).toBe(false);
        expect(isInRange(-10.1, { min: -10, max: 0 })).toBe(false);

        expect(() => assertInRange(-1, { min: 0, max: 10 })).toThrow(RGXOutOfBoundsError);
        expect(() => assertInRange(-0.1, { min: 0, max: 1 })).toThrow(RGXOutOfBoundsError);
        expect(() => assertInRange(-10.1, { min: -10, max: 0 })).toThrow(RGXOutOfBoundsError);
    });

    it('always rejects a value greater than the max', () => {
        expect(isInRange(11, { min: 0, max: 10 })).toBe(false);
        expect(isInRange(1.1, { min: 0, max: 1 })).toBe(false);
        expect(isInRange(0.1, { min: -10, max: 0 })).toBe(false);

        expect(() => assertInRange(11, { min: 0, max: 10 })).toThrow(RGXOutOfBoundsError);
        expect(() => assertInRange(1.1, { min: 0, max: 1 })).toThrow(RGXOutOfBoundsError);
        expect(() => assertInRange(0.1, { min: -10, max: 0 })).toThrow(RGXOutOfBoundsError);
    });

    it('accepts a value equal to the minimum when inclusiveLeft is true', () => {
        expect(isInRange(0, { min: 0, max: 10, inclusiveLeft: true })).toBe(true);
        expect(() => assertInRange(0, { min: 0, max: 10, inclusiveLeft: true })).not.toThrow();
    });

    it('rejects a value equal to the minimum when inclusiveLeft is false', () => {
        expect(isInRange(0, { min: 0, max: 10, inclusiveLeft: false })).toBe(false);
        expect(() => assertInRange(0, { min: 0, max: 10, inclusiveLeft: false })).toThrow(RGXOutOfBoundsError);
    });

    it('accepts a value equal to the maximum when inclusiveRight is true', () => {
        expect(isInRange(10, { min: 0, max: 10, inclusiveRight: true })).toBe(true);
        expect(() => assertInRange(10, { min: 0, max: 10, inclusiveRight: true })).not.toThrow();
    });

    it('rejects a value equal to the maximum when inclusiveRight is false', () => {
        expect(isInRange(10, { min: 0, max: 10, inclusiveRight: false })).toBe(false);
        expect(() => assertInRange(10, { min: 0, max: 10, inclusiveRight: false })).toThrow(RGXOutOfBoundsError);
    });
});

describe('RGXRegexNotMatchedAtPositionError', () => {
    const pattern = /foo/;
    const source = 'hello world foobar';

    it('has the correct name', () => {
        const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 0);
        expect(error.name).toBe('RGXRegexNotMatchedAtPositionError');
    });

    it('has the correct code', () => {
        const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 0);
        expect(error.code).toBe('REGEX_NOT_MATCHED_AT_POSITION');
    });

    it('exposes the pattern property', () => {
        const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 0);
        expect(error.pattern).toBe(pattern);
    });

    it('exposes the source property', () => {
        const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 0);
        expect(error.source).toBe(source);
    });

    it('exposes the position property', () => {
        const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 5);
        expect(error.position).toBe(5);
    });

    it('defaults contextSize to null', () => {
        const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 0);
        expect(error.contextSize).toBeNull();
    });

    it('accepts a custom contextSize', () => {
        const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 5, 3);
        expect(error.contextSize).toBe(3);
    });

    it('is an instance of RGXError', () => {
        const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 0);
        expect(error).toBeInstanceOf(RGXError);
    });

    it('throws RGXOutOfBoundsError when position is negative', () => {
        expect(() => new RGXRegexNotMatchedAtPositionError('No match', pattern, source, -1)).toThrow(RGXOutOfBoundsError);
    });

    it('throws RGXOutOfBoundsError when position is >= source length', () => {
        expect(() => new RGXRegexNotMatchedAtPositionError('No match', pattern, source, source.length)).toThrow(RGXOutOfBoundsError);
    });

    it('throws RGXOutOfBoundsError when setting position out of bounds', () => {
        const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 0);
        expect(() => { error.position = -1; }).toThrow(RGXOutOfBoundsError);
        expect(() => { error.position = source.length; }).toThrow(RGXOutOfBoundsError);
    });

    describe('sourceContext', () => {
        it('returns the full source when contextSize is null', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 5);
            expect(error.sourceContext()).toBe(source);
        });

        it('returns the full source when contextSize covers the entire string', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 5, 100);
            expect(error.sourceContext()).toBe(source);
        });

        it('returns a substring around the position based on contextSize', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 8, 3);
            expect(error.sourceContext()).toBe(source.slice(5, 11));
        });

        it('clamps the start to 0', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 1, 3);
            expect(error.sourceContext()).toBe(source.slice(0, 4));
        });

        it('clamps the end to source length', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, source.length - 1, 3);
            expect(error.sourceContext()).toBe(source.slice(source.length - 4, source.length));
        });
    });

    describe('hasLeftContext', () => {
        it('returns false when contextSize is null', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 5);
            expect(error.hasLeftContext()).toBe(false);
        });

        it('returns true when position - contextSize >= 0', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 5, 3);
            expect(error.hasLeftContext()).toBe(true);
        });

        it('returns false when position - contextSize < 0', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 1, 3);
            expect(error.hasLeftContext()).toBe(false);
        });
    });

    describe('hasRightContext', () => {
        it('returns false when contextSize is null', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 5);
            expect(error.hasRightContext()).toBe(false);
        });

        it('returns true when position + contextSize <= source length', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 5, 3);
            expect(error.hasRightContext()).toBe(true);
        });

        it('returns false when position + contextSize > source length', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, source.length - 1, 3);
            expect(error.hasRightContext()).toBe(false);
        });
    });

    describe('hasFullContext', () => {
        it('returns true when contextSize is null', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 5);
            expect(error.hasFullContext()).toBe(true);
        });

        it('returns true when contextSize covers the entire string', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 5, 100);
            expect(error.hasFullContext()).toBe(true);
        });

        it('returns false when either side has context truncated', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 8, 3);
            expect(error.hasFullContext()).toBe(false);
        });
    });

    describe('toString', () => {
        it('formats correctly with no contextSize (full source shown)', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 5);
            expect(error.toString()).toBe(
                `RGXRegexNotMatchedAtPositionError: No match; Pattern: /foo/, Position: 5, Context: ${source}`
            );
        });

        it('formats correctly with contextSize that covers the full source', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 5, 100);
            expect(error.toString()).toBe(
                `RGXRegexNotMatchedAtPositionError: No match; Pattern: /foo/, Position: 5, Context: ${source}`
            );
        });

        it('formats correctly with ellipsis on both sides', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 8, 3);
            expect(error.toString()).toBe(
                `RGXRegexNotMatchedAtPositionError: No match; Pattern: /foo/, Position: 8, Context: ...${source.slice(5, 11)}...`
            );
        });

        it('formats correctly with ellipsis only on the right', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, 1, 3);
            expect(error.toString()).toBe(
                `RGXRegexNotMatchedAtPositionError: No match; Pattern: /foo/, Position: 1, Context: ${source.slice(0, 4)}...`
            );
        });

        it('formats correctly with ellipsis only on the left', () => {
            const error = new RGXRegexNotMatchedAtPositionError('No match', pattern, source, source.length - 1, 3);
            expect(error.toString()).toBe(
                `RGXRegexNotMatchedAtPositionError: No match; Pattern: /foo/, Position: ${source.length - 1}, Context: ...${source.slice(source.length - 4, source.length)}`
            );
        });
    });
});

describe("RGXPartValidationFailedError", () => {
    it('has the correct name', () => {
        const error = new RGXPartValidationFailedError('Validation failed', 'rawValue', 'transformedValue');
        expect(error.name).toBe('RGXPartValidationFailedError');
    });

    it('has the correct code', () => {
        const error = new RGXPartValidationFailedError('Validation failed', 'rawValue', 'transformedValue');
        expect(error.code).toBe('PART_VALIDATION_FAILED');
    });

    it('exposes the gotRaw property', () => {
        const error = new RGXPartValidationFailedError('Validation failed', 'rawValue', 'transformedValue');
        expect(error.gotRaw).toBe('rawValue');
    });

    it('exposes the gotTransformed property', () => {
        const error = new RGXPartValidationFailedError('Validation failed', 'rawValue', 'transformedValue');
        expect(error.gotTransformed).toBe('transformedValue');
    });

    it('formats the error message correctly', () => {
        const error = new RGXPartValidationFailedError('Validation failed', 'rawValue', 'transformedValue');
        expect(error.toString()).toBe(
            `RGXPartValidationFailedError: Validation failed; Got: rawValue (transformed: "transformedValue")`
        );
    });
});
