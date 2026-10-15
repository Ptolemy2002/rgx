import * as t from "./types";
import { rgxClassInit } from "./class";
import { registerCustomFlagTransformers } from "./flag-transformer";
import { rgxConcat } from "./concat";
import { placeRGXToken, withRGXInsertionRoot } from "./internal/insertionContext";
import { resolveRGXToken } from "./resolve";
import { removeRedundantRegexGroups } from "./internal/analyzeRegexSource";
import { scanOptionsFromFlags } from "./internal/scanRegexSource";
import { rgxTaggedTemplateToArray } from "./internal/taggedTemplateToArray";
import { assertValidRegexFlags, ExtRegExp } from "./ExtRegExp";
import { RGXPart, RGXTokenOrPart, RGXWalker } from "./walker";
import { createRegex } from "./utils/createRegex";

// Call this for certain class methods to work correctly
rgxClassInit();
// Call this for our custom flags to work correctly
registerCustomFlagTransformers();

export function rgxa(tokens: t.RGXToken[], flags: string = ''): ExtRegExp {
    assertValidRegexFlags(flags);
    // Insertions are checked while the pattern is built.
    const concatenated = withRGXInsertionRoot(flags, () => rgxConcat(tokens, true, flags));
    // Nothing else is added to the final pattern, so groups at its edges can be removed too.
    const pattern = removeRedundantRegexGroups(concatenated, { ...scanOptionsFromFlags(flags), isolated: true });
    return createRegex(pattern, flags, true);
}

export default function rgx(flags: string = '', {multiline=true, verbatim=true}: t.RGXOptions = {}) {
    return (strings: TemplateStringsArray, ...tokens: t.RGXToken[]) => {
        // It is safe to assert the result because we know there will be no parts passed in here.
        return rgxa(rgxTaggedTemplateToArray(strings, tokens, multiline, verbatim) as t.RGXToken[], flags);
    };
}

export function rgxwa<R = unknown, S = unknown, T = unknown>(
    source: string, tokens: RGXTokenOrPart<R, S, T>[],
    options: Omit<t.RGXWOptions<R, S>, "multiline"> = {}
) {
    // The walker matches each token on its own, without flags, so each one is checked at its position by resolving it
    // as the top level of a pattern with no flags.
    const plainTokens = tokens.map(t => RGXPart.check(t) ? t.token : t);
    withRGXInsertionRoot('' as t.ValidRegexFlags, () => {
        plainTokens.forEach((token, i) => placeRGXToken(plainTokens, i, () => resolveRGXToken(token)));
    });

    return new RGXWalker<R, S>(source, tokens, options);
}

export function rgxw<R = unknown, S = unknown, T = unknown>(source: string, {multiline=true, verbatim=true, ...options}: t.RGXWOptions<R, S> = {}) {
    return (strings: TemplateStringsArray, ...tokens: RGXTokenOrPart<R, S, T>[]) => {
        return rgxwa<R, S, T>(source, rgxTaggedTemplateToArray(strings, tokens, multiline, verbatim), options);
    };
}

// Do all exports after to avoid circular dependencies issues.
export * from "./errors";
export * from "./types";
export * from "./typeGuards";
export * from "./collection";
export * from "./class";
export * from "./resolve";
export * from "./json";
export * from "./concat";
export * from "./utils";
export * from "./ExtRegExp";
export * from "./flag-transformer";
export * from "./clone";
export * from "./constants";
export * from "./walker";
export * from "./lexer";