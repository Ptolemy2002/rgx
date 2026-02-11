import isCallable from "is-callable";

export type RGXNoOpToken = null | undefined;
export type RGXNativeToken = string | number | boolean | RGXNoOpToken;
export type RGXConvertibleToken = { toRgx: () => RGXNativeToken | RGXNativeToken[] };
export type RGXToken = RGXNativeToken | RGXConvertibleToken | RGXToken[];

export function isRGXNoOpToken(value: unknown): value is RGXNoOpToken {
    return value === null || value === undefined;
}

export function isRGXNativeToken(value: unknown): value is RGXNativeToken {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || isRGXNoOpToken(value);
}

export function isRGXConvertibleToken(value: unknown): value is RGXConvertibleToken {
    if (typeof value === 'object' && value !== null && 'toRgx' in value) {
        if (isCallable(value.toRgx)) {
            const returnValue = value.toRgx();

            if (Array.isArray(returnValue)) {
                return returnValue.every(isRGXNativeToken);
            }

            return isRGXNativeToken(returnValue);
        }

        return false;
    }

    return false;
}

export function escapeRegex(value: string): string {
    return value.replaceAll(/[\-\^\$.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveRGXToken(token: RGXToken): string {
    if (isRGXNoOpToken(token)) return '';
    if (isRGXNativeToken(token)) return escapeRegex(String(token));

    if (isRGXConvertibleToken(token)) {
        return resolveRGXToken(token.toRgx());
    }

    // Interpret arrays as unions
    if (Array.isArray(token)) {
        return '(' + token.map(resolveRGXToken).join('|') + ')';
    }

    throw new TypeError(`Invalid RGX token: ${token}`);
}

export default function rgx(strings: TemplateStringsArray, ...tokens: RGXToken[]): RegExp {
    let pattern = '';
    const resolvedTokens = tokens.map(resolveRGXToken);

    for (let i = 0; i < strings.length; i++) {
        pattern += strings[i];
        if (i < resolvedTokens.length) {
            pattern += resolvedTokens[i];
        }
    }
    return new RegExp(pattern);
}