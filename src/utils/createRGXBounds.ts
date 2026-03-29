
import { RGXConvertibleToken, RGXToken, ValidRegexString } from "src/types";
import { isRGXConvertibleToken } from "src/typeGuards";
import { createRegex } from "./createRegex";
import { resolveRGXToken } from "src/resolve";
import { ExtRegExp } from "src/ExtRegExp";

function convertNoGroupWrap(token: RGXToken): RGXToken {
    const boundPart = { rgxGroupWrap: false };

    if (isRGXConvertibleToken(token)) {
        return { ...token, ...boundPart };
    } else {
        return token;
    }
}

function convertToBound(token: ExtRegExp): RGXConvertibleToken {
    // Bounds are not groups themselves, cannot be repeated (since they don't consume characters)
    // and should never be group wrapped
    const boundPart = { rgxGroupWrap: false, rgxIsGroup: false, rgxIsRepeatable: false };

    return {
        ...boundPart,
        toRgx: () => token
    };
}

export function createRGXBounds(before: RGXToken, after: RGXToken, flags: string = ""): [RGXConvertibleToken, RGXConvertibleToken] {
    const resolvedBefore = resolveRGXToken(convertNoGroupWrap(before), {groupWrap: false, currentFlags: flags});
    const resolvedAfter = resolveRGXToken(convertNoGroupWrap(after), {groupWrap: false, currentFlags: flags});

    const startBound = convertToBound(createRegex(`(?<=${resolvedBefore})(?=${resolvedAfter})`, flags, true));
    const endBound = convertToBound(createRegex(`(?<=${resolvedAfter})(?=${resolvedBefore})`, flags, true));

    return [startBound, endBound];
}