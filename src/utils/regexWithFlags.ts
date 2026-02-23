import { assertValidVanillaRegexFlags } from "src/typeGuards";
import { normalizeVanillaRegexFlags } from "./normalizeRegexFlags";

export function regexWithFlags(exp: RegExp, flags: string, replace=false): RegExp {
    assertValidVanillaRegexFlags(flags);
    if (replace) return new RegExp(exp.source, flags);

    const existingFlags = exp.flags;
    const newFlags = existingFlags + flags;
    return new RegExp(exp.source, normalizeVanillaRegexFlags(newFlags));
}