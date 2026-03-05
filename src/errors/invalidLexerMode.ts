import { RGXError } from "src/errors";

export class RGXInvalidLexerModeError extends RGXError {
    got: string;

    constructor(message: string, got: string) {
        super(message, 'INVALID_LEXER_MODE');

        this.name = 'RGXInvalidLexerModeError';
        this.got = got;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${JSON.stringify(this.got)}`;
    }
}