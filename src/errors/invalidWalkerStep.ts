import { RGXError } from "./base";

export class RGXInvalidWalkerStepError extends RGXError {
    // The step's position in the walker's tokens, if known.
    index: number | null;
    got: string;

    constructor(message: string, index: number | null, got: string) {
        super(message, 'INVALID_WALKER_STEP');
        this.name = 'RGXInvalidWalkerStepError';
        this.index = index;
        this.got = got;
    }

    calcMessage(message: string) {
        let result = message;
        if (this.index !== null) result += `; Step index: ${this.index}`;
        return `${result}; Got: ${JSON.stringify(this.got)}`;
    }
}
