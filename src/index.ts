import * as t from "./types";
import { rgxClassInit } from "./class";
import { registerCustomFlagTransformers } from "./flag-transformer";
import { rgxConcat } from "./concat";
import { assureAcceptance, rgxTaggedTemplateToArray } from "./internal";
import { assertValidRegexFlags, ExtRegExp, extRegExp } from "./ExtRegExp";
import { RGXPart, RGXTokenOrPart, RGXWalker } from "./walker";

export * from "./errors";
export * from "./types";
export * from "./typeGuards";
export * from "./collection";
export * from "./class";
export * from "./resolve";
export * from "./concat";
export * from "./utils";
export * from "./ExtRegExp";
export * from "./flag-transformer";
export * from "./clone";
export * from "./constants";
export * from "./walker";
export * from "./lexer";

// Call this for certain class methods to work correctly
rgxClassInit();
// Call this for our custom flags to work correctly
registerCustomFlagTransformers();

export function rgxa(tokens: t.RGXToken[], flags: string = ''): ExtRegExp {
    assertValidRegexFlags(flags);
    assureAcceptance(tokens, flags);
    const pattern = rgxConcat(tokens, true, flags);
    return extRegExp(pattern, flags);
}

export default function rgx(flags: string = '', multiline=true, verbatim=true) {
    assertValidRegexFlags(flags);
    return (strings: TemplateStringsArray, ...tokens: t.RGXToken[]) => {
        // It is safe to assert the result because we know there will be no parts passed in here.
        return rgxa(rgxTaggedTemplateToArray(strings, tokens, multiline, verbatim) as t.RGXToken[], flags);
    };
}

export function rgxwa<R = unknown, S = unknown, T = unknown>(
    source: string, tokens: RGXTokenOrPart<R, S, T>[],
    options: Omit<t.RGXWOptions<R, S>, "multiline"> = {}
) {
    assureAcceptance(tokens.map(t => RGXPart.check(t) ? t.token : t), '' as t.ValidRegexFlags);
    return new RGXWalker<R, S>(source, tokens, options);
}

export function rgxw<R = unknown, S = unknown, T = unknown>(source: string, {multiline=true, verbatim=true, ...options}: t.RGXWOptions<R, S> = {}) {
    return (strings: TemplateStringsArray, ...tokens: RGXTokenOrPart<R, S, T>[]) => {
        return rgxwa<R, S, T>(source, rgxTaggedTemplateToArray(strings, tokens, multiline, verbatim), options);
    };
}