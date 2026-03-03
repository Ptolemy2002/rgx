import { assertValidRegexFlags } from "src/ExtRegExp";
import { normalizeRegexFlags } from "./normalizeRegexFlags";
import { ExtRegExp } from "src/ExtRegExp";

export function regexWithFlags(exp: RegExp | ExtRegExp, flags: string, replace=false): ExtRegExp {
    assertValidRegexFlags(flags);
    if (replace) return new ExtRegExp(exp.source, flags);

    const existingFlags = exp.flags;
    const newFlags = existingFlags + flags;
    return new ExtRegExp(exp.source, normalizeRegexFlags(newFlags));
}