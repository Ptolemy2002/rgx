import * as e from "./errors";
import * as t from "./types";
import * as tg from "./type-guards";

export * from "./errors";
export * from "./types";
export * from "./type-guards";

export function escapeRegex(value: string) {
    return value.replaceAll(/[\-\^\$.*+?^${}()|[\]\\]/g, '\\$&') as t.ValidRegexString;
}

export function resolveRGXToken(token: t.RGXToken): t.ValidRegexString {
    if (tg.isRGXNoOpToken(token)) return '' as t.ValidRegexString;
    if (tg.isRGXLiteralToken(token)) return '(?:' + token.source + ')' as t.ValidRegexString;
    if (tg.isRGXNativeToken(token)) return escapeRegex(String(token));

    if (tg.isRGXConvertibleToken(token)) {
        return resolveRGXToken(token.toRgx());
    }

    // Interpret arrays as unions
    if (Array.isArray(token)) {
        if (token.length === 0) return '' as t.ValidRegexString;
        
        if (token.length > 1) {
            return '(?:' + token.map(resolveRGXToken).join('|') + ')' as t.ValidRegexString;
        }

        return resolveRGXToken(token[0]);
    }

    // Ignoring this line since it should be impossible to reach if the types are correct, but we need it to satisfy the return type
    /* istanbul ignore next */
    throw new e.RGXInvalidTokenError(`Invalid RGX token: ${token}`, null, token);
}

// Wrapper for letting an array of tokens be resolved as a concatenation instead of a union.
export function rgxConcat(tokens: t.RGXToken[]): t.ValidRegexString {
    return tokens.map(resolveRGXToken).join('') as t.ValidRegexString;
}

export default function rgx(flags: string = '') {
    tg.assertValidVanillaRegexFlags(flags);
    return (strings: TemplateStringsArray, ...tokens: t.RGXToken[]) => {
        let pattern = '';
        const resolvedTokens = tokens.map(resolveRGXToken);

        for (let i = 0; i < strings.length; i++) {
            pattern += strings[i];
            if (i < resolvedTokens.length) {
                pattern += resolvedTokens[i];
            }
        }
        
        return new RegExp(pattern, flags);
    };
}