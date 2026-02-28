import { RGXError } from "src/errors";

export class RGXConstantConflictError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'CONSTANT_CONFLICT');

        this.name = 'RGXConstantConflictError';
        this.got = got;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${JSON.stringify(this.got)}`;
    }
}