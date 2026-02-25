import { RGXError } from "src/errors";

export class RGXInvalidVanillaRegexFlagsError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'INVALID_VANILLA_REGEX_FLAGS');
        this.name = 'RGXInvalidVanillaRegexFlagsError';
        this.got = got;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${JSON.stringify(this.got)}`;
    }
}