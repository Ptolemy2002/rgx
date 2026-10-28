import { RGXError } from "src/errors";

export class RGXInvalidPatternTransformerKeyError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'INVALID_PATTERN_TRANSFORMER_KEY');

        this.name = 'RGXInvalidPatternTransformerKeyError';
        this.got = got;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${JSON.stringify(this.got)}`;
    }
}