import { normalizeRegexFlags } from "./normalizeRegexFlags";
import { ExtRegExp } from "src/ExtRegExp";
import { createRegex } from "./createRegex";

export function regexWithFlags(exp: RegExp | ExtRegExp, flags: string, replace=false): ExtRegExp {
    if (!replace) flags = normalizeRegexFlags(exp.flags + flags);
    // An ExtRegExp is rebuilt from its source before its custom flag transformations, which applies each custom flag
    // once and lets replacing the flags remove them, and keeps its selection of pattern transformers.
    return exp instanceof ExtRegExp ? new ExtRegExp(exp, flags) : createRegex(exp.source, flags, true);
}
