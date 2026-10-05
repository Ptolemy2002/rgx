import { ExpectedTokenType, RGXInvalidTokenError } from "./invalidToken";

export class RGXInvalidJSONTokenError extends RGXInvalidTokenError {
    constructor(message: string, expected: ExpectedTokenType | null = { type: "tokenType", values: ["json"] }, got: unknown = undefined) {
        super(message, expected, got);
        this.name = 'RGXInvalidJSONTokenError';
        this.code = 'INVALID_RGX_JSON_TOKEN';
    }
}
