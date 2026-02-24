import { RGXInvalidRegexFlagsError, RGXInvalidVanillaRegexFlagsError } from "src/errors";
import { isValidRegexFlags } from "src/ExtRegExp";
import { isValidVanillaRegexFlags } from "src/typeGuards";

export function normalizeRegexFlags(flags: string): string {
    const seenFlags = new Set<string>();
    let normalizedFlags = '';

    for (const flag of flags) {
        if (!isValidRegexFlags(flag)) {
            throw new RGXInvalidRegexFlagsError(`[${flag}] is not valid.`, flags);
        }

        if (!seenFlags.has(flag)) {
            seenFlags.add(flag);
            normalizedFlags += flag;
        }
    }

    return normalizedFlags;
}

export function normalizeVanillaRegexFlags(flags: string): string {
    for (const flag of flags) {
        if (!isValidVanillaRegexFlags(flag)) {
            throw new RGXInvalidVanillaRegexFlagsError(`[${flag}] is not a valid vanilla regex flag.`, flags);
        }
    }

    // This will not throw, as all vanilla flags are valid regex flags.
    return normalizeRegexFlags(flags);
}