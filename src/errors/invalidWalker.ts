import { RGXError } from "src/errors";
import { RGXClassToken } from "src/class";

export class RGXInvalidWalkerError extends RGXError {
    constructorName: string;
    got: unknown;

    constructor(message: string, got: unknown, constructorName="RGXWalker") {
        super(message, 'INVALID_RGX_WALKER');
        this.name = 'RGXInvalidWalkerError';
        this.got = got;
        this.constructorName = constructorName;
    }

    calcMessage(message: string) {
        const gotString = RGXClassToken.check(this.got) ? `instance of ${this.got.constructor.name}` : JSON.stringify(this.got);
        return `${message}; Expected: [instance of ${this.constructorName}]; Got: [${gotString}]`;
    }
}