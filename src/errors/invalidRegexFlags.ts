import { RGXError } from "src/errors";

export class RGXInvalidRegexFlagsError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'INVALID_REGEX_FLAGS');
        this.name = 'RGXInvalidRegexFlagsError';
        this.got = got;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${JSON.stringify(this.got)}`;
    }
}