import { RGXError } from "src/errors";

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