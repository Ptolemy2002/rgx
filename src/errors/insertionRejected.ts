import { RGXError } from "./base";

export class RGXInsertionRejectedError extends RGXError {
    reason: string | null = null;

    constructor(reason: string | null = null, message: string | null = null) {
        super(message || "", "INSERTION_REJECTED");
        this.reason = reason;
        this.name = "RGXInsertionRejectedError";
    }

    calcMessage(message: string) {
        let result = `Insertion rejected`;
        if (this.reason) result += `; Reason: ${this.reason}`;
        if (message) result += `; Additional info: ${message}`;
        return result;
    }
}