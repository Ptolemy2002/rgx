import * as t from "./types";
import { rgxClassInit } from "./class";
import { registerCustomFlagTransformers } from "./flag-transformer";
import { rgxConcat } from "./concat";
import { assureAcceptance, taggedTemplateToArray } from "./internal";
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

export default function rgx(flags: string = '', multiline=true) {
    assertValidRegexFlags(flags);
    return (strings: TemplateStringsArray, ...tokens: t.RGXToken[]) => {
        return rgxa(taggedTemplateToArray(strings, tokens, multiline), flags);
    };
}

export function rgxwa<R = unknown, S = unknown, T = unknown>(source: string, tokens: RGXTokenOrPart<R, S, T>[], options: Omit<t.RGXWOptions<R, S>, "multiline"> = {}) {
    assureAcceptance(tokens.map(t => RGXPart.check(t) ? t.token : t), '' as t.ValidRegexFlags);
    return new RGXWalker<R, S>(source, tokens, options);
}

export function rgxw<R = unknown, S = unknown, T = unknown>(source: string, {multiline=true, ...options}: t.RGXWOptions<R, S> = {}) {
    return (strings: TemplateStringsArray, ...tokens: RGXTokenOrPart<R, S, T>[]) => {
        return rgxwa<R, S, T>(source, taggedTemplateToArray(strings, tokens, multiline), options);
    };
}