import { RGXError } from "src/errors";

export class RGXInvalidPartAliasError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'INVALID_PART_ALIAS');

        this.name = 'RGXInvalidPartAliasError';
        this.got = got;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${JSON.stringify(this.got)}`;
    }
}
