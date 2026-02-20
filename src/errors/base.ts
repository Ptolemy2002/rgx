export type RGXErrorCode = 'UNKNOWN' | 'INVALID_RGX_TOKEN' | 'INVALID_REGEX_STRING' | 'INVALID_VANILLA_REGEX_FLAGS' | 'NOT_IMPLEMENTED';

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