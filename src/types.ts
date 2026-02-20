import { Branded } from "@ptolemy2002/ts-brand-utils";
import { MaybeArray } from "@ptolemy2002/ts-utils";

export type RGXNoOpToken = null | undefined;
export type RGXLiteralToken = RegExp;
export type RGXNativeToken = string | number | boolean | RGXNoOpToken;
export type RGXConvertibleTokenOutput = MaybeArray<RGXNativeToken | RGXLiteralToken>;
export type RGXConvertibleToken = { toRgx: () => RGXConvertibleTokenOutput };
export type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXToken[];

export type RGXTokenType = 'no-op' | 'literal' | 'native' | 'convertible' | RGXTokenType[];
export type RGXTokenTypeFlat = Exclude<RGXTokenType, RGXTokenType[]> | "array";
export type RGXTokenTypeGuardInput = Exclude<RGXTokenType, RGXTokenType[]> | RGXTokenTypeFlat | null | RGXTokenTypeGuardInput[];
export type RGXTokenFromType<T extends RGXTokenTypeGuardInput> =
    T extends null ? RGXToken :
    T extends 'no-op' ? RGXNoOpToken :
    T extends 'literal' ? RGXLiteralToken :
    T extends 'native' ? RGXNativeToken :
    T extends 'convertible' ? RGXConvertibleToken :
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