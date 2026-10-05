import { RGXClassToken } from "src/class";
import { RGXInsertionRejectedError } from "src/errors";
import { isRGXConvertibleToken, isRGXJSONClassToken } from "src/typeGuards";
import { rgxTokenFromJSON } from "src/json";
import { RGXToken, ValidRegexFlags } from "src/types";

export function assureAcceptance(tokens: RGXToken[], flags: ValidRegexFlags) {
    for (let i = 0; i < tokens.length; i++) {
        // JSON class tokens become class tokens, which may have insertion preferences.
        const rawToken = tokens[i];
        const token = isRGXJSONClassToken(rawToken, false) ? rgxTokenFromJSON(rawToken) : rawToken;

        if (isRGXConvertibleToken(token) && token.rgxAcceptInsertion) {
            const messageOrAccepted = token.rgxAcceptInsertion(tokens, flags);
            if (messageOrAccepted === true) continue;

            const extraMessage = `index ${i}, token type ${RGXClassToken.check(token) ? token.constructor.name : "unknown"}`;
            if (messageOrAccepted === false) throw new RGXInsertionRejectedError(null, extraMessage);
            throw new RGXInsertionRejectedError(messageOrAccepted, extraMessage);
        }
    }
}