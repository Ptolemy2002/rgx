export type RGXErrorCode = 
    'UNKNOWN' |
    'INVALID_RGX_TOKEN' |
    'INVALID_REGEX_STRING' |
    'INVALID_REGEX_FLAGS' |
    'INVALID_VANILLA_REGEX_FLAGS' |
    'NOT_IMPLEMENTED' |
    'NOT_SUPPORTED' |
    'INVALID_IDENTIFIER' |
    'OUT_OF_BOUNDS' |
    'INVALID_FLAG_TRANSFORMER_KEY' |
    'FLAG_TRANSFORMER_CONFLICT' |
    'CONSTANT_CONFLICT' |
    'INVALID_CONSTANT_KEY' |
    'INSERTION_REJECTED' |
    'REGEX_NOT_MATCHED_AT_POSITION'
;

export class RGXError extends Error {
    _message: string;
    code: RGXErrorCode = 'UNKNOWN';

    get message() {
        return this.calcMessage(this._message);
    }

    set message(value: string) {
        this._message = value;
    }

    constructor(message: string, code?: RGXErrorCode) {
        super();
        this.name = 'RGXError';
        this.message = message;

        if (code) {
            this.code = code;
        }
    }

    calcMessage(message: string) {
        return message;
    }

    toString() {
        return `${this.name}: ${this.message}`;
    }
}