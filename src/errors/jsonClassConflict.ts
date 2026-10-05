import { RGXError } from "./base";

export class RGXJSONClassConflictError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'JSON_CLASS_CONFLICT');

        this.name = 'RGXJSONClassConflictError';
        this.got = got;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${JSON.stringify(this.got)}`;
    }
}
