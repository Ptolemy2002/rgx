import { RGXError } from "./base";

export class RGXCurrentTokenNotFoundError extends RGXError {
    constructor(message: string) {
        super(message, 'CURRENT_TOKEN_NOT_FOUND');

        this.name = 'RGXCurrentTokenNotFoundError';
    }
}