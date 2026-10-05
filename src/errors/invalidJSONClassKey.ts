import { RGXError } from "./base";

export class RGXInvalidJSONClassKeyError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'INVALID_JSON_CLASS_KEY');

        this.name = 'RGXInvalidJSONClassKeyError';
        this.got = got;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${JSON.stringify(this.got)}`;
    }
}
