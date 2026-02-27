import { RGXInsertionRejectedError } from "src/errors";
import { isRGXConvertibleToken } from "src/typeGuards";
import { RGXToken, ValidRegexFlags } from "src/types";

export function assureAcceptance(tokens: RGXToken[], flags: ValidRegexFlags) {
    for (const token of tokens) {
        if (isRGXConvertibleToken(token) && token.rgxAcceptInsertion) {
            const messageOrAccepted = token.rgxAcceptInsertion(tokens, flags);
            if (messageOrAccepted === true) continue;
            if (messageOrAccepted === false) throw new RGXInsertionRejectedError();

            throw new RGXInsertionRejectedError(messageOrAccepted);
        }
    }
}