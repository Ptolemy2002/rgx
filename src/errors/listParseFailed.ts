import { RGXError } from "src/errors";

export class RGXListParseFailedError extends RGXError {
    got: string;
    position: number;

    constructor(message: string, got: string, position: number) {
        super(message, 'LIST_PARSE_FAILED');

        this.name = 'RGXListParseFailedError';
        this.got = got;
        this.position = position;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${JSON.stringify(this.got)}; Position: ${this.position}`;
    }
}
