import { RGXError } from "src/errors";

export class RGXInvalidRegexStringError extends RGXError {
    got: string;
    cause: SyntaxError;

    constructor(message: string, got: string, cause: SyntaxError) {
        super(message, 'INVALID_REGEX_STRING');
        this.name = 'RGXInvalidRegexStringError';
        this.got = got;
        this.cause = cause;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${JSON.stringify(this.got)}; Cause: ${this.cause.message}`;
    }
}