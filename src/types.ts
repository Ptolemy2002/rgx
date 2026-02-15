import { Branded } from "@ptolemy2002/ts-brand-utils";
import { MaybeArray } from "@ptolemy2002/ts-utils";

export type RGXNoOpToken = null | undefined;
export type RGXLiteralToken = RegExp;
export type RGXNativeToken = string | number | boolean | RGXNoOpToken;
export type RGXConvertibleToken = { toRgx: () => MaybeArray<RGXNativeToken | RGXLiteralToken> };
export type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXToken[];

export type RGXTokenType = 'no-op' | 'literal' | 'native' | 'convertible' | RGXTokenType[];
export type RGXTokenTypeFlat = Exclude<RGXTokenType, RGXTokenType[]> | "array";
export type RGXTokenFromType<T extends RGXTokenType> =
    T extends 'no-op' ? RGXNoOpToken :
    T extends 'literal' ? RGXLiteralToken :
    T extends 'native' ? RGXNativeToken :
    T extends 'convertible' ? RGXConvertibleToken :
    T extends RGXTokenType[] ? { [K in keyof T]: T[K] extends RGXTokenType ? RGXTokenFromType<T[K]> : never } :
    never
;

export const validRegexSymbol = Symbol('rgx.ValidRegex');
export type ValidRegexBrandSymbol = typeof validRegexSymbol;
export type ValidRegexString = Branded<string, [ValidRegexBrandSymbol]>;

export const validVanillaRegexFlagsSymbol = Symbol('rgx.ValidVanillaRegexFlags');
export type ValidVanillaRegexFlagsBrandSymbol = typeof validVanillaRegexFlagsSymbol;
export type ValidVanillaRegexFlags = Branded<string, [ValidVanillaRegexFlagsBrandSymbol]>;