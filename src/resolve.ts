import { removeRgxUnionDuplicates } from "./class";
import * as e from "./errors";
import * as tg from "./typeGuards";
import * as t from "./types";

export function escapeRegex(value: string) {
    return value.replaceAll(/[\-\^\$.*+?^${}()|[\]\\]/g, '\\$&') as t.ValidRegexString;
}


function localizableVanillaRegexFlagDiff(prev: string, next: string) {
    // Remove anything other than the "ims" flags from both strings, as
    // other flags are not localizable (including our custom flags).
    prev = prev.replaceAll(/[^ims]/g, '');
    next = next.replaceAll(/[^ims]/g, '');

    // Format <added flags>-<removed flags>
    const added = [...new Set(next.split(''))].filter(flag => !prev.includes(flag)).join('');
    const removed = [...new Set(prev.split(''))].filter(flag => !next.includes(flag)).join('');

    if (added === '' && removed === '') return '';
    if (removed === '') return `${added}`;
    return `${added}-${removed}`;
}

export function resolveRGXToken(token: t.RGXToken, groupWrap=true, topLevel=true, currentFlags=''): t.ValidRegexString {
    if (tg.isRGXNoOpToken(token)) return '' as t.ValidRegexString;

    if (tg.isRGXLiteralToken(token)) {
        const localizableFlagDiff = localizableVanillaRegexFlagDiff(currentFlags, token.flags);
        currentFlags = token.flags;
        if (!localizableFlagDiff) {
            if (groupWrap) return '(?:' + token.source + ')' as t.ValidRegexString;
            else return token.source as t.ValidRegexString;
        } else {
            return `(?${localizableFlagDiff}:${token.source})` as t.ValidRegexString;
        }
    }

    if (tg.isRGXNativeToken(token)) return escapeRegex(String(token));

    if (tg.isRGXConvertibleToken(token)) {
        // The top-level group-wrapping preference propogates to a direct convertible token, but after that
        // the preference falls back to true whenever a token doesn't explicitly specify a preference.
        return resolveRGXToken(token.toRgx(), token.rgxGroupWrap ?? (topLevel ? groupWrap : true), false, currentFlags);
    }

    // Interpret arrays as unions
    if (tg.isRGXArrayToken(token, false)) {
        if (token.length === 0) return '' as t.ValidRegexString;
        
        if (token.length > 1) {
            // Remove duplicates
            token = [...removeRgxUnionDuplicates(...token)];

            // Don't preserve group wrapping preference for the recursive calls
            if (groupWrap) return '(?:' + token.map(t => resolveRGXToken(t, true, false, currentFlags)).join('|') + ')' as t.ValidRegexString;
            else return token.map(t => resolveRGXToken(t, true, false, currentFlags)).join('|') as t.ValidRegexString;
        }

        return resolveRGXToken(token[0], true, false, currentFlags);
    }

    // Ignoring this line since it should be impossible to reach if the types are correct, but we need it to satisfy the return type
    /* istanbul ignore next */
    throw new e.RGXInvalidTokenError(`Invalid RGX token: ${token}`, null, token);
}