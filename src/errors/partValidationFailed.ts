import { RGXError } from "./base";

export class RGXPartValidationFailedError extends RGXError {
    gotRaw: string;
    gotTransformed: unknown;

    constructor(message: string, gotRaw: string, gotTransformed: unknown) {
        super(message, 'PART_VALIDATION_FAILED');
        this.name = 'RGXPartValidationFailedError';
        this.gotRaw = gotRaw;
        this.gotTransformed = gotTransformed;
    }

    calcMessage(message: string) {
        return `${message}; Got: ${this.gotRaw} (transformed: ${JSON.stringify(this.gotTransformed)})`;
    }
}