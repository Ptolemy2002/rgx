import { removeRgxUnionDuplicates } from "./class";
import * as e from "./errors";
import { assertValidRegexFlags } from "./ExtRegExp";
import * as tg from "./typeGuards";
import * as t from "./types";

export function escapeRegex(value: string) {
    const result = value.replaceAll(/[\-\^\$.*+?^${}()|[\]\\]/g, '\\$&');
    tg.assertValidRegexString(result);
    return result;
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
    assertValidRegexFlags(currentFlags);
    const innerResolve = (): string => {
        if (tg.isRGXNoOpToken(token)) return '';

        if (tg.isRGXLiteralToken(token)) {
            const localizableFlagDiff = localizableVanillaRegexFlagDiff(currentFlags, token.flags);
            currentFlags = token.flags;
            if (!localizableFlagDiff) {
                if (groupWrap) return '(?:' + token.source + ')';
                else return token.source;
            } else {
                return `(?${localizableFlagDiff}:${token.source})`;
            }
        }

        if (tg.isRGXNativeToken(token)) return escapeRegex(String(token));

        if (tg.isRGXConvertibleToken(token)) {
            // If it's an interpolation, we want to just return it as-is.
            // This will mean the result might be an invalid regex string,
            // but that's why we have a check.
            if (token.rgxInterpolate) return String(token.toRgx());
            
            // The top-level group-wrapping preference propogates to a direct convertible token, but after that
            // the preference falls back to true whenever a token doesn't explicitly specify a preference.
            return resolveRGXToken(token.toRgx(), token.rgxGroupWrap ?? (topLevel ? groupWrap : true), false, currentFlags);
        }

        // Interpret arrays as unions
        if (tg.isRGXArrayToken(token, false)) {
            if (token.length === 0) return '';
            
            if (token.length > 1) {
                // Remove duplicates
                token = [...removeRgxUnionDuplicates(...token)];

                // Don't preserve group wrapping preference for the recursive calls
                if (groupWrap) return '(?:' + token.map(t => resolveRGXToken(t, true, false, currentFlags)).join('|') + ')';
                else return token.map(t => resolveRGXToken(t, true, false, currentFlags)).join('|');
            }

            return resolveRGXToken(token[0], true, false, currentFlags);
        }

        // Ignoring this line since it should be impossible to reach if the types are correct, but we need it to satisfy the return type
        /* istanbul ignore next */
        throw new e.RGXInvalidTokenError(`Invalid RGX token: ${token}`, null, token);
    };

    const result = innerResolve();
    tg.assertValidRegexString(result);
    return result;
}