import { removeRgxUnionDuplicates } from "./class";
import * as e from "./errors";
import { assertValidRegexFlags } from "./ExtRegExp";
import * as tg from "./typeGuards";
import * as t from "./types";
import { hasRegexParenErrors, localizableVanillaRegexFlagDiff, removeRedundantRegexGroups, scanOptionsFromFlags } from "./internal";
import { rgxTokenFromJSON } from "./json";

export type ResolveRGXTokenOptions = {
    groupWrap?: boolean;
    topLevel?: boolean;
    currentFlags?: string;
};

export function escapeRegex(value: string) {
    const result = value.replaceAll(/[\-\^\$.*+?^${}()|[\]\\]/g, '\\$&');
    tg.assertValidRegexString(result);
    return result;
}

export function rgxInterpolation(source: string): t.RGXInterpolationToken {
    return { rgxInterpolation: source };
}

export function resolveRGXToken(token: t.RGXToken, { groupWrap = true, topLevel = true, currentFlags = '' }: ResolveRGXTokenOptions = {}): t.ValidRegexString {
    assertValidRegexFlags(currentFlags);

    // JSON tokens are converted to their runtime equivalents (literal, class, or interpolation tokens) before resolving.
    if (tg.isRGXJSONObjectToken(token, false)) token = rgxTokenFromJSON(token);

    // Read before resolving, since resolving a literal token replaces currentFlags with the literal's own flags.
    const scanOptions = scanOptionsFromFlags(currentFlags);
    let acceptParenErrors = false;
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

        // Interpolations are returned as-is. They might have an unterminated group,
        // but that's okay, since a future token might terminate it, and if it doesn't, that
        // will be caught by one of the checks that the entire resolved string
        // is a valid regex string.
        if (tg.isRGXInterpolationToken(token)) {
            acceptParenErrors = true;
            return token.rgxInterpolation;
        }

        if (tg.isRGXConvertibleToken(token)) {
            // The top-level group-wrapping preference propogates to a direct convertible token, but after that
            // the preference falls back to true.
            return resolveRGXToken(token.toRgx(), { groupWrap: topLevel ? groupWrap : true, topLevel: false, currentFlags });
        }

        // Interpret arrays as unions
        if (tg.isRGXArrayToken(token, false)) {
            if (token.length === 0) return '';

            if (token.length > 1) {
                // Remove duplicates
                token = [...removeRgxUnionDuplicates(...token)];

                // Don't preserve group wrapping preference for the recursive calls
                if (groupWrap) return '(?:' + token.map(t => resolveRGXToken(t, { groupWrap: true, topLevel: false, currentFlags })).join('|') + ')';
                else return token.map(t => resolveRGXToken(t, { groupWrap: true, topLevel: false, currentFlags })).join('|');
            }

            return resolveRGXToken(token[0], { groupWrap: true, topLevel: false, currentFlags });
        }

        // Ignoring this line since it should be impossible to reach if the types are correct, but we need it to satisfy the return type
        /* istanbul ignore next */
        throw new e.RGXInvalidTokenError(`Invalid RGX token: ${token}`, null, token);
    };

    let result = innerResolve();

    if (!(acceptParenErrors && hasRegexParenErrors(result, scanOptions))) tg.assertValidRegexString(result);

    // Nested resolutions are part of this one, so only remove redundant groups once, at the top level.
    if (topLevel) result = removeRedundantRegexGroups(result, scanOptions);
    return result as t.ValidRegexString;
}