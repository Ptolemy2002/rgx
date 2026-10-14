import { RGXError } from "./base";
import type { RGXInsertionContext } from "src/types";

export class RGXInsertionRejectedError extends RGXError {
    reason: string | null = null;
    // Where the rejected token was placed, if known.
    context: RGXInsertionContext | null = null;

    constructor(reason: string | null = null, message: string | null = null, context: RGXInsertionContext | null = null) {
        super(message || "", "INSERTION_REJECTED");
        this.reason = reason;
        this.context = context;
        this.name = "RGXInsertionRejectedError";
    }

    calcMessage(message: string) {
        let result = `Insertion rejected`;
        if (this.reason) result += `; Reason: ${this.reason}`;
        if (message) result += `; Additional info: ${message}`;
        return result;
    }
}
