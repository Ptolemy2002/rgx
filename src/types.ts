import { Branded } from "@ptolemy2002/ts-brand-utils";
import type { RGXClassToken } from "./class";

export type RGXNoOpToken = null | undefined;
export type RGXLiteralToken = RegExp;
export type RGXNativeToken = string | number | boolean | RGXNoOpToken;
export type RGXConvertibleToken = { toRgx: () => RGXToken };
export type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXToken[];

export type RGXTokenType = 'no-op' | 'literal' | 'native' | 'convertible' | 'class' | RGXTokenType[];
export type RGXTokenTypeFlat = Exclude<RGXTokenType, RGXTokenType[]> | "array";
export type RGXTokenTypeGuardInput = RGXTokenTypeFlat | null | RGXTokenTypeGuardInput[];
export type RGXTokenFromType<T extends RGXTokenTypeGuardInput> =
    T extends null ? RGXToken :
    T extends 'no-op' ? RGXNoOpToken :
    T extends 'literal' ? RGXLiteralToken :
    T extends 'native' ? RGXNativeToken :
    T extends 'convertible' ? RGXConvertibleToken :
    T extends 'class' ? RGXClassToken :
    T extends 'array' ? RGXToken[] :
    T extends RGXTokenTypeGuardInput[] ? { [K in keyof T]: T[K] extends RGXTokenTypeGuardInput ? RGXTokenFromType<T[K]> : never } :
    never
;

export const validRegexSymbol = Symbol('rgx.ValidRegex');
export type ValidRegexBrandSymbol = typeof validRegexSymbol;
export type ValidRegexString = Branded<string, [ValidRegexBrandSymbol]>;

export const validVanillaRegexFlagsSymbol = Symbol('rgx.ValidVanillaRegexFlags');
export type ValidVanillaRegexFlagsBrandSymbol = typeof validVanillaRegexFlagsSymbol;
export type ValidVanillaRegexFlags = Branded<string, [ValidVanillaRegexFlagsBrandSymbol]>;