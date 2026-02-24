import { RGXError } from "src/errors";

export class RGXFlagTransformerConflictError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'FLAG_TRANSFORMER_CONFLICT');
        this.name = 'RGXFlagTransformerConflictError';
        this.got = got;
    }

    toString() {
        return `${this.name}: ${this.message}; Got: ${JSON.stringify(this.got)}`;
    }
}