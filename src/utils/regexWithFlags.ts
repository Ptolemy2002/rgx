import { normalizeRegexFlags } from "./normalizeRegexFlags";
import { ExtRegExp } from "src/ExtRegExp";
import { createRegex } from "./createRegex";

export function regexWithFlags(exp: RegExp | ExtRegExp, flags: string, replace=false): ExtRegExp {
    if (replace) return createRegex(exp.source, flags, true);

    const existingFlags = exp.flags;
    const newFlags = existingFlags + flags;
    return createRegex(exp.source, normalizeRegexFlags(newFlags), true);
}