import { RGXError } from "src/errors";
import { RGXClassToken } from "src/class";

export class RGXInvalidLexerError extends RGXError {
    constructorName: string;
    got: unknown;

    constructor(message: string, got: unknown, constructorName="RGXLexer") {
        super(message, 'INVALID_RGX_LEXER');
        this.name = 'RGXInvalidLexerError';
        this.got = got;
        this.constructorName = constructorName;
    }

    calcMessage(message: string) {
        const gotString = RGXClassToken.check(this.got) ? `instance of ${this.got.constructor.name}` : JSON.stringify(this.got);
        return `${message}; Expected: [instance of ${this.constructorName}]; Got: [${gotString}]`;
    }
}