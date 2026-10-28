import { RGXError } from "src/errors";

export class RGXPatternTransformerConflictError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'PATTERN_TRANSFORMER_CONFLICT');

        this.name = 'RGXPatternTransformerConflictError';
        this.got = got;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${JSON.stringify(this.got)}`;
    }
}