import { RGXError } from "src/errors";

export class RGXInvalidFlagTransformerKeyError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'INVALID_FLAG_TRANSFORMER_KEY');
        this.name = 'RGXInvalidFlagTransformerKeyError';
        this.got = got;
    }

    toString() {
        return `${this.name}: ${this.message}; Got: ${JSON.stringify(this.got)}`;
    }
}