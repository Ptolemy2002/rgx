export type RGXErrorCode = 
    'UNKNOWN' |
    'INVALID_RGX_TOKEN' |
    'INVALID_REGEX_STRING' |
    'INVALID_REGEX_FLAGS' |
    'INVALID_VANILLA_REGEX_FLAGS' |
    'NOT_IMPLEMENTED' |
    'INVALID_IDENTIFIER' |
    'OUT_OF_BOUNDS' |
    'INVALID_FLAG_TRANSFORMER_KEY' |
    'FLAG_TRANSFORMER_CONFLICT'
;

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