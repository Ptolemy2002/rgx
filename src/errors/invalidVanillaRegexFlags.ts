import { RGXError } from "src/errors";

export class RGXInvalidVanillaRegexFlagsError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'INVALID_VANILLA_REGEX_FLAGS');
        this.name = 'RGXInvalidVanillaRegexFlagsError';
        this.got = got;
    }

    toString() {
        return `${this.name}: ${this.message}; Got: ${JSON.stringify(this.got)}`;
    }
}