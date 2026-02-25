import { RGXError } from "src/errors";

export class RGXInvalidRegexStringError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'INVALID_REGEX_STRING');
        this.name = 'RGXInvalidRegexStringError';
        this.got = got;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${JSON.stringify(this.got)}`;
    }
}