import * as e from "./errors";
import * as t from "./types";
import * as tg from "./typeGuards";
import { rgxClassInit } from "./class";
import { rgxConcat } from "./concat";

export * from "./errors";
export * from "./types";
export * from "./typeGuards";
export * from "./collection";
export * from "./class";
export * from "./resolve";
export * from "./concat";

// Call this for certain class methods to work correctly
rgxClassInit();

function taggedTemplateToTokenArray(strings: TemplateStringsArray, tokens: t.RGXToken[]): t.RGXToken[] {
    const tokenArray: t.RGXToken[] = [];

    for (let i = 0; i < strings.length; i++) {
        if (strings[i]) tokenArray.push(strings[i]);
        if (i < tokens.length) tokenArray.push(tokens[i]);
    }

    return tokenArray;
}

export function rgxa(tokens: t.RGXToken[], flags: string = ''): RegExp {
    tg.assertValidVanillaRegexFlags(flags);
    const pattern = rgxConcat(tokens);
    return new RegExp(pattern, flags);
}

export default function rgx(flags: string = '') {
    tg.assertValidVanillaRegexFlags(flags);
    return (strings: TemplateStringsArray, ...tokens: t.RGXToken[]) => {
        return rgxa(taggedTemplateToTokenArray(strings, tokens), flags);
    };
}