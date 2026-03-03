import { RGXError } from "./base";

export class RGXPartValidationFailedError extends RGXError {
    id: string;
    gotRaw: string;
    gotTransformed: unknown;

    constructor(id: string | null, message: string, gotRaw: string, gotTransformed: unknown) {
        super(message, 'PART_VALIDATION_FAILED');
        this.name = 'RGXPartValidationFailedError';
        this.id = id ?? 'unknown';
        this.gotRaw = gotRaw;
        this.gotTransformed = gotTransformed;
    }

    calcMessage(message: string) {
        return `${message}; ID: ${this.id}; Got: ${this.gotRaw} (transformed: ${JSON.stringify(this.gotTransformed)})`;
    }
}