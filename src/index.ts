import * as t from "./types";
import { rgxClassInit } from "./class";
import { registerCustomFlagTransformers } from "./flag-transformer";
import { rgxConcat } from "./concat";
import { taggedTemplateToArray } from "./internal";
import { assertValidRegexFlags, ExtRegExp, extRegExp } from "./ExtRegExp";

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

// Call this for certain class methods to work correctly
rgxClassInit();
// Call this for our custom flags to work correctly
registerCustomFlagTransformers();

export function rgxa(tokens: t.RGXToken[], flags: string = ''): ExtRegExp {
    assertValidRegexFlags(flags);
    const pattern = rgxConcat(tokens, true, flags);
    return extRegExp(pattern, flags);
}

export default function rgx(flags: string = '') {
    assertValidRegexFlags(flags);
    return (strings: TemplateStringsArray, ...tokens: t.RGXToken[]) => {
        return rgxa(taggedTemplateToArray(strings, tokens), flags);
    };
}