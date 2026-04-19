import * as t from "src/types";

export function localizableVanillaRegexFlagDiff(prev: string, next: string): t.ValidRegexLocalizableFlagDiff {
    // Remove anything other than the "ims" flags from both strings, as
    // other flags are not localizable (including our custom flags).
    prev = prev.replaceAll(/[^ims]/g, '');
    next = next.replaceAll(/[^ims]/g, '');

    // Format <added flags>-<removed flags>
    const added = [...new Set(next.split(''))].filter(flag => !prev.includes(flag)).join('');
    const removed = [...new Set(prev.split(''))].filter(flag => !next.includes(flag)).join('');

    if (added === '' && removed === '') return '' as t.ValidRegexLocalizableFlagDiff;
    if (removed === '') return `${added}` as t.ValidRegexLocalizableFlagDiff;
    return `${added}-${removed}` as t.ValidRegexLocalizableFlagDiff;
}