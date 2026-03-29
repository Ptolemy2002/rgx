
import { RGXConvertibleToken, RGXToken, ValidRegexString } from "src/types";
import { isRGXConvertibleToken } from "src/typeGuards";
import { createRegex } from "./createRegex";
import { resolveRGXToken } from "src/resolve";
import { ExtRegExp } from "src/ExtRegExp";

export type CreateRGXBoundsOptions = {
    flags?: string;
    anchorStart?: boolean;
    anchorEnd?: boolean;
};

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

export function createRGXBounds(positive: RGXToken, negative: RGXToken, options: CreateRGXBoundsOptions | string | boolean = {}): [RGXConvertibleToken, RGXConvertibleToken] {
    if (typeof options === "string") options = { flags: options };
    else if (typeof options === "boolean") options = { anchorStart: options, anchorEnd: options };
    const { flags = "", anchorStart = true, anchorEnd = true } = options;

    const resolvedPositive = resolveRGXToken(convertNoGroupWrap(positive), {groupWrap: false, currentFlags: flags});
    const resolvedNegative = resolveRGXToken(convertNoGroupWrap(negative), {groupWrap: false, currentFlags: flags});

    const startBound = convertToBound(createRegex(`(?<=${resolvedNegative}${anchorStart ? "|^" : ""})(?=${resolvedPositive})`, flags, true));
    const endBound = convertToBound(createRegex(`(?<=${resolvedPositive})(?=${resolvedNegative}${anchorEnd ? "|$" : ""})`, flags, true));

    return [startBound, endBound];
}