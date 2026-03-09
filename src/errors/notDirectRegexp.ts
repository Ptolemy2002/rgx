import { RGXError } from "./base";

export class RGXNotDirectRegExpError extends RGXError {
    gotConstructorName: string;

    constructor(message: string, gotConstructorName: string) {
        super(message, 'NOT_DIRECT_REGEXP');
        this.name = 'RGXNotDirectRegExpError';
        this.gotConstructorName = gotConstructorName;
    }

    calcMessage(message: string) {
        return `${message}; Expected direct instance of RegExp; Got instance of ${this.gotConstructorName}`;
    }
}