import { RGXError } from "./base";

export class RGXNotImplementedError extends RGXError {
    functionality: string;

    constructor(functionality: string, message: string | null = null) {
        super(message || "", "NOT_IMPLEMENTED");
        this.functionality = functionality;
        this.name = "RGXNotImplementedError";
    }

    calcMessage(message: string) {
        const result = `${this.functionality} is not implemented yet.`;
        if (message) return result + ` Additional info: ${message}`;
        else return result;
    }
}