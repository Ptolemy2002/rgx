import { RGXError } from "./base";

export class RGXNotJSONSerializableError extends RGXError {
    got: unknown;
    reason: string | null;

    constructor(message: string, got: unknown, reason: string | null = null) {
        super(message, 'NOT_JSON_SERIALIZABLE');

        this.name = 'RGXNotJSONSerializableError';
        this.got = got;
        this.reason = reason;
    }

    calcMessage(message: string) {
        let gotString: string;
        try {
            gotString = JSON.stringify(this.got) ?? String(this.got);
        } catch {
            gotString = String(this.got);
        }

        let result = `${message}; Got: ${gotString}`;
        if (this.reason !== null) result += `; Reason: ${this.reason}`;
        return result;
    }
}
