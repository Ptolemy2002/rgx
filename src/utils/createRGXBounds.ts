
import { RGXConvertibleToken, RGXToken, ValidRegexString } from "src/types";
import { createRegex } from "./createRegex";
import { resolveRGXToken } from "src/resolve";
import { ExtRegExp } from "src/ExtRegExp";

export type CreateRGXBoundsOptions = {
    flags?: string;
    anchorStart?: boolean;
    anchorEnd?: boolean;
    inner?: boolean;
};

// Bounds are detected as non-repeatable, since they only contain lookarounds and so consume no characters.
function convertToBound(token: ExtRegExp): RGXConvertibleToken {
    return { toRgx: () => token };
}

export function createRGXBounds(
    positive: RGXToken,
    negative: RGXToken,
    options: CreateRGXBoundsOptions | string | boolean = {}
): [RGXConvertibleToken, RGXConvertibleToken] {
    if (typeof options === "string") options = { flags: options };
    else if (typeof options === "boolean") options = { anchorStart: options, anchorEnd: options };
    const { flags = "", anchorStart = true, anchorEnd = true, inner = true } = options;

    const resolvedPositive = resolveRGXToken(positive, { groupWrap: false, currentFlags: flags });
    const resolvedNegative = resolveRGXToken(negative, { groupWrap: false, currentFlags: flags });

    const startLookbehind = `(?<=${resolvedNegative}${anchorStart ? "|^" : ""})`;
    const startLookahead = inner ? `(?=${resolvedPositive})` : "";
    const startBound = convertToBound(createRegex(`${startLookbehind}${startLookahead}`, flags, true));

    const endLookbehind = inner ? `(?<=${resolvedPositive})` : "";
    const endLookahead =  `(?=${resolvedNegative}${anchorEnd ? "|$" : ""})`;
    const endBound = convertToBound(createRegex(`${endLookbehind}${endLookahead}`, flags, true));

    return [startBound, endBound];
}