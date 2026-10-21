import { removeRgxUnionDuplicates, RGXClassWrapperToken, RGXConstantToken } from "./class";
import * as e from "./errors";
import { assertValidRegexFlags } from "./ExtRegExp";
import * as tg from "./typeGuards";
import * as t from "./types";
import {
    assertValidRegexPiece, claimRGXInsertionPlacement, hasRegexParenErrors, isRGXInsertionCheckActive, localizableVanillaRegexFlagDiff,
    placeRGXToken, removeRedundantRegexGroups, scanOptionsFromFlags
} from "./internal";
import { rgxTokenFromJSON } from "./json";

export type ResolveRGXTokenOptions = {
    groupWrap?: boolean;
    topLevel?: boolean;
    currentFlags?: string;
};

export function escapeRegex(value: string) {
    // "-" is written as "\x2d" rather than "\-", since "\-" is only valid inside a character class with the u or v flag,
    // and the result must not form a range inside a character class either.
    const result = value.replaceAll(/[\^\$.*+?${}()|[\]\\]/g, '\\$&').replaceAll('-', '\\x2d');
    tg.assertValidRegexString(result);
    return result;
}

export function rgxInterpolation(source: string): t.RGXInterpolationToken {
    return { rgxInterpolation: source };
}

export function resolveRGXToken(token: t.RGXToken, options: ResolveRGXTokenOptions = {}): t.ValidRegexString {
    let { groupWrap = true, topLevel = true, currentFlags = '' } = options;

    // While a pattern is being built, a token resolved on its own (such as by a container's toRgx()) is placed
    // as the only token at its level. Arrays aren't placed themselves, since their members are placed below.
    if (!claimRGXInsertionPlacement(token) && topLevel && isRGXInsertionCheckActive() && !tg.isRGXArrayToken(token, false)) {
        return placeRGXToken([token], 0, () => resolveRGXToken(token, options));
    }

    assertValidRegexFlags(currentFlags);

    // JSON tokens are converted to their runtime equivalents (literal, class, or interpolation tokens) before resolving.
    if (tg.isRGXJSONObjectToken(token, false)) token = rgxTokenFromJSON(token);

    const scanOptions = scanOptionsFromFlags(currentFlags);
    let acceptParenErrors = false;
    const innerResolve = (): string => {
        if (tg.isRGXNoOpToken(token)) return '';

        if (tg.isRGXLiteralToken(token)) {
            const localizableFlagDiff = localizableVanillaRegexFlagDiff(currentFlags, token.flags);
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
            const result = token.toRgx(currentFlags);
            const resultOptions = { groupWrap: topLevel ? groupWrap : true, topLevel: false, currentFlags };

            // A single token returned by toRgx() (such as the token an RGXClassWrapperToken wraps) is placed inside
            // this one. Arrays place their own members.
            if (tg.isRGXArrayToken(result, false)) return resolveRGXToken(result, resultOptions);
            // Wrappers and constant references pass their own check along to the token they return, so it isn't
            // checked again.
            const passesCheckAlong = RGXClassWrapperToken.check(token) || RGXConstantToken.check(token);
            return placeRGXToken([result], 0, () => resolveRGXToken(result, resultOptions), !passesCheckAlong);
        }

        // Interpret arrays as unions
        if (tg.isRGXArrayToken(token, false)) {
            if (token.length === 0) return '';

            if (token.length > 1) {
                // Remove duplicates
                const members = [...removeRgxUnionDuplicates(...token)];

                // Don't preserve group wrapping preference for the recursive calls
                const resolved = members.map((member, i) => placeRGXToken(members, i, () => resolveRGXToken(member, { groupWrap: true, topLevel: false, currentFlags })));
                if (groupWrap) return '(?:' + resolved.join('|') + ')';
                else return resolved.join('|');
            }

            const members = token;
            return placeRGXToken(members, 0, () => resolveRGXToken(members[0], { groupWrap: true, topLevel: false, currentFlags }));
        }

        // Ignoring this line since it should be impossible to reach if the types are correct, but we need it to satisfy the return type
        /* istanbul ignore next */
        throw new e.RGXInvalidTokenError(`Invalid RGX token: ${token}`, null, token);
    };

    let result = innerResolve();

    if (!(acceptParenErrors && hasRegexParenErrors(result, scanOptions))) assertValidRegexPiece(result, currentFlags);

    // Nested resolutions are part of this one, so only remove redundant groups once, at the top level.
    if (topLevel) result = removeRedundantRegexGroups(result, scanOptions);
    return result as t.ValidRegexString;
}