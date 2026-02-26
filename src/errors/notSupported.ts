import { RGXError } from "./base";

export class RGXNotSupportedError extends RGXError {
    functionality: string;

    constructor(functionality: string, message: string | null = null) {
        super(message || "", "NOT_SUPPORTED");
        this.functionality = functionality;
        this.name = "RGXNotSupportedError";
    }

    calcMessage(message: string) {
        const result = `${this.functionality} is not supported.`;
        if (message) return result + ` Additional info: ${message}`;
        else return result;
    }
}