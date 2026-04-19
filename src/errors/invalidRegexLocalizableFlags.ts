import { RGXError } from "src/errors";

export class RGXInvalidRegexLocalizableFlagsError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'INVALID_REGEX_LOCALIZABLE_FLAGS');
        this.name = 'RGXInvalidRegexLocalizableFlagsError';
        this.got = got;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${JSON.stringify(this.got)}`;
    }
}