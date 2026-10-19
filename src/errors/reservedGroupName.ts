import { RGXError } from "./base";

export class RGXReservedGroupNameError extends RGXError {
    groupName: string;
    got: string;

    constructor(message: string, groupName: string, got: string) {
        super(message, 'RESERVED_GROUP_NAME');
        this.name = 'RGXReservedGroupNameError';
        this.groupName = groupName;
        this.got = got;
    }

    calcMessage(message: string) {
        return `${message}; Group name: ${JSON.stringify(this.groupName)}; Got: ${JSON.stringify(this.got)}`;
    }
}
