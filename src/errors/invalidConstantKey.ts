import { RGXError } from "src/errors";

export class RGXInvalidConstantKeyError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'INVALID_CONSTANT_KEY');

        this.name = 'RGXInvalidConstantKeyError';
        this.got = got;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${JSON.stringify(this.got)}`;
    }
}