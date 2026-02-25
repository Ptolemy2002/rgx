import { RGXError } from "src/errors";

export class RGXInvalidIdentifierError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'INVALID_IDENTIFIER');
        this.name = 'RGXInvalidIdentifierError';
        this.got = got;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${JSON.stringify(this.got)}`;
    }
}