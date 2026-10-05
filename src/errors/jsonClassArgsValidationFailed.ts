import { RGXError } from "./base";

export class RGXJSONClassArgsValidationFailedError extends RGXError {
    className: string;
    args: unknown[];
    reason: string | null;

    constructor(className: string, args: unknown[], reason: string | null = null) {
        super("JSON class argument validation failed", 'JSON_CLASS_ARGS_VALIDATION_FAILED');

        this.name = 'RGXJSONClassArgsValidationFailedError';
        this.className = className;
        this.args = args;
        this.reason = reason;
    }

    calcMessage(message: string) {
        let result = `${message}; Class: ${JSON.stringify(this.className)}; Args: ${JSON.stringify(this.args)}`;
        if (this.reason !== null) result += `; Reason: ${this.reason}`;
        return result;
    }
}
