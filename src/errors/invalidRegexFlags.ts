import { RGXError } from "src/errors";

export class RGXInvalidRegexFlagsError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'INVALID_REGEX_FLAGS');
        this.name = 'RGXInvalidRegexFlagsError';
        this.got = got;
    }

    toString() {
        return `${this.name}: ${this.message}; Got: ${JSON.stringify(this.got)}`;
    }
}