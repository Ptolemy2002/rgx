import { RGXError } from "src/errors";

export class RGXInvalidIdentifierError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'INVALID_IDENTIFIER');
        this.name = 'RGXInvalidIdentifierError';
        this.got = got;
    }

    toString() {
        return `${this.name}: ${this.message}; Got: ${JSON.stringify(this.got)}`;
    }
}