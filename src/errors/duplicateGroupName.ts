import { RGXError } from "./base";

export class RGXDuplicateGroupNameError extends RGXError {
    groupName: string;
    got: string;

    constructor(message: string, groupName: string, got: string) {
        super(message, 'DUPLICATE_GROUP_NAME');
        this.name = 'RGXDuplicateGroupNameError';
        this.groupName = groupName;
        this.got = got;
    }

    calcMessage(message: string) {
        return `${message}; Group name: ${JSON.stringify(this.groupName)}; Got: ${JSON.stringify(this.got)}`;
    }
}
