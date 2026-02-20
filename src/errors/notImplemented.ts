import { RGXError } from "./base";

export class RGXNotImplementedError extends RGXError {
    functionality: string;

    constructor(functionality: string, message: string | null = null) {
        super(message || "", "NOT_IMPLEMENTED");
        this.functionality = functionality;
        this.name = "RGXNotImplementedError";
    }

    toString() {
        const result = `${this.name}: ${this.functionality} is not implemented yet.`;
        if (this.message) return result + ` Additional info: ${this.message}`;
        else return result;
    }
}