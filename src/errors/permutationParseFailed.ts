import { RGXError } from "src/errors";

export class RGXPermutationParseFailedError extends RGXError {
    got: string;
    position: number;

    constructor(message: string, got: string, position: number) {
        super(message, 'PERMUTATION_PARSE_FAILED');

        this.name = 'RGXPermutationParseFailedError';
        this.got = got;
        this.position = position;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${JSON.stringify(this.got)}; Position: ${this.position}`;
    }
}
