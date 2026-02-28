import { RGXClassToken } from "src/class";
import { RGXInsertionRejectedError } from "src/errors";
import { isRGXConvertibleToken } from "src/typeGuards";
import { RGXToken, ValidRegexFlags } from "src/types";

export function assureAcceptance(tokens: RGXToken[], flags: ValidRegexFlags) {
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (isRGXConvertibleToken(token) && token.rgxAcceptInsertion) {
            const messageOrAccepted = token.rgxAcceptInsertion(tokens, flags);
            if (messageOrAccepted === true) continue;

            const extraMessage = `index ${i}, token type ${RGXClassToken.check(token) ? token.constructor.name : "unknown"}`;
            if (messageOrAccepted === false) throw new RGXInsertionRejectedError(null, extraMessage);
            throw new RGXInsertionRejectedError(messageOrAccepted, extraMessage);
        }
    }
}