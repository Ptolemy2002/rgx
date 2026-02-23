import { RGXInvalidVanillaRegexFlagsError } from "src/errors";

export function normalizeVanillaRegexFlags(flags: string): string {
    const validFlags = ['g', 'i', 'm', 's', 'u', 'y'];
    const seenFlags = new Set<string>();
    let normalizedFlags = '';

    for (const flag of flags) {
        if (!validFlags.includes(flag)) {
            throw new RGXInvalidVanillaRegexFlagsError(`[${flag}] is not valid.`, flags);
        }

        if (!seenFlags.has(flag)) {
            seenFlags.add(flag);
            normalizedFlags += flag;
        }
    }

    return normalizedFlags;
}