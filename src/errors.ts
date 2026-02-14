export type RGXErrorCode = 'UNKNOWN' | 'INVALID_RGX_TOKEN' | 'INVALID_REGEX_STRING' | 'INVALID_VANILLA_REGEX_FLAGS';

export class RGXError extends Error {
    code: RGXErrorCode = 'UNKNOWN';

    constructor(message: string, code?: RGXErrorCode) {
        super(message);
        this.name = 'RGXError';
        if (code) {
            this.code = code;
        }
    }
}

export class RGXInvalidTokenError extends RGXError {
    expected: string = '[null, undefined, string, number, boolean, RegExp, convertible object, or array of native/literal tokens]';
    got: unknown;

    constructor(message: string, expected: string | null, got: unknown) {
        super(message, 'INVALID_RGX_TOKEN');
        this.name = 'RGXInvalidTokenError';
        if (expected !== null) this.expected = "[" + expected + "]";
        this.got = got;
    }

    toString() {
        return `${this.name}: ${this.message}; Expected: ${this.expected}; Got: ${JSON.stringify(this.got)}`;
    }
}

export class RGXInvalidRegexStringError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'INVALID_REGEX_STRING');
        this.name = 'RGXInvalidRegexStringError';
        this.got = got;
    }

    toString() {
        return `${this.name}: ${this.message}; Got: ${JSON.stringify(this.got)}`;
    }
}

export class RGXInvalidVanillaRegexFlagsError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'INVALID_VANILLA_REGEX_FLAGS');
        this.name = 'RGXInvalidVanillaRegexFlagsError';
        this.got = got;
    }

    toString() {
        return `${this.name}: ${this.message}; Got: ${JSON.stringify(this.got)}`;
    }
}