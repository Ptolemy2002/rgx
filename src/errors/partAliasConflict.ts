import { RGXError } from "src/errors";

export class RGXPartAliasConflictError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'PART_ALIAS_CONFLICT');

        this.name = 'RGXPartAliasConflictError';
        this.got = got;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${JSON.stringify(this.got)}`;
    }
}
