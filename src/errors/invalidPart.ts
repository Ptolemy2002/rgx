import { RGXError } from "src/errors";
import { RGXClassToken } from "src/class";

export class RGXInvalidPartError extends RGXError {
    constructorName: string;
    got: unknown;

    constructor(message: string, got: unknown, constructorName="RGXPart") {
        super(message, 'INVALID_RGX_PART');
        this.name = 'RGXInvalidPartError';
        this.got = got;
        this.constructorName = constructorName;
    }

    calcMessage(message: string) {
        const gotString = RGXClassToken.check(this.got) ? `instance of ${this.got.constructor.name}` : JSON.stringify(this.got);
        return `${message}; Expected: [instance of ${this.constructorName}]; Got: [${gotString}]`;
    }
}