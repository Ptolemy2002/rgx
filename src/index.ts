import * as t from "./types";
import * as tg from "./typeGuards";
import { rgxClassInit } from "./class";
import { rgxConcat } from "./concat";
import { taggedTemplateToArray } from "./internal";

export * from "./errors";
export * from "./types";
export * from "./typeGuards";
export * from "./collection";
export * from "./class";
export * from "./resolve";
export * from "./concat";

// Call this for certain class methods to work correctly
rgxClassInit();

export function rgxa(tokens: t.RGXToken[], flags: string = ''): RegExp {
    tg.assertValidVanillaRegexFlags(flags);
    const pattern = rgxConcat(tokens);
    return new RegExp(pattern, flags);
}

export default function rgx(flags: string = '') {
    tg.assertValidVanillaRegexFlags(flags);
    return (strings: TemplateStringsArray, ...tokens: t.RGXToken[]) => {
        return rgxa(taggedTemplateToArray(strings, tokens), flags);
    };
}