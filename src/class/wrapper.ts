import { RGXToken } from "src/types";
import { RGXClassToken } from "./base";
import { isRGXGroupedToken, isRGXToken } from "src/typeGuards";
import { createAssertClassGuardFunction, createClassGuardFunction, createConstructFunction } from "src/internal";

export class RGXClassWrapperToken extends RGXClassToken {
    token: RGXToken;

    static check = createClassGuardFunction(RGXClassWrapperToken);
    static assert = createAssertClassGuardFunction(RGXClassWrapperToken);

    constructor(token: RGXToken) {
        super();
        this.token = token;
    }

    get isGroup(): boolean {
        return isRGXGroupedToken(this.token);
    }

    get isRepeatable(): boolean {
        if (isRGXToken(this.token, 'class')) return this.token.isRepeatable;
        // Assume any other token is repeatable, since we don't know its implementation.
        return true;
    }

    unwrap(): RGXToken {
        return this.token;
    }

    toRgx(): RGXToken {
        return this.unwrap();
    }
}

export const rgxClassWrapper = createConstructFunction(RGXClassWrapperToken);