import { RGXError } from "src/errors";

export class RGXInvalidRegexLocalizableFlagDiffError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'INVALID_REGEX_LOCALIZABLE_FLAG_DIFF');
        this.name = 'RGXInvalidRegexLocalizableFlagDiffError';
        this.got = got;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${JSON.stringify(this.got)}`;
    }
}