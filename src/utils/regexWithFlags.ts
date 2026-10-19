import { normalizeRegexFlags } from "./normalizeRegexFlags";
import { ExtRegExp } from "src/ExtRegExp";
import { createRegex } from "./createRegex";

export function regexWithFlags(exp: RegExp | ExtRegExp, flags: string, replace=false): ExtRegExp {
    // The source of an ExtRegExp has its custom flag transformations applied, so it is rebuilt from the source from
    // before them, which applies each custom flag once and lets replacing the flags remove them.
    const source = exp instanceof ExtRegExp ? exp.originalSource : exp.source;
    if (replace) return createRegex(source, flags, true);

    const existingFlags = exp.flags;
    const newFlags = existingFlags + flags;
    return createRegex(source, normalizeRegexFlags(newFlags), true);
}