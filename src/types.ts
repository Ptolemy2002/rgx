import { Branded } from "@ptolemy2002/ts-brand-utils";
import type { RGXClassToken } from "./class";
import type { ExtRegExp } from "./ExtRegExp";
import type { RGXTokenCollection } from "./collection";
import type { RGXWalkerOptions } from "./walker";

export type RGXNoOpToken = null | undefined;
export type RGXLiteralToken = RegExp;
export type RGXNativeToken = string | number | boolean | RGXNoOpToken;
export type RGXConvertibleToken = {
    toRgx: () => RGXToken,
    rgxAcceptInsertion?: (tokens: RGXToken[], flags: ValidRegexFlags) => string | boolean,
    readonly rgxGroupWrap?: boolean,
    readonly rgxIsGroup?: boolean,
    readonly rgxIsRepeatable?: boolean
};
export type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXToken[];

export type RGXClassTokenConstructor = new (...args: unknown[]) => RGXClassToken;

export type RGXGroupedToken = RGXToken[] | RGXLiteralToken | RGXGroupedConvertibleToken;
export type RGXGroupedConvertibleToken = (RGXConvertibleToken & { readonly rgxIsGroup: true }) | (Omit<RGXConvertibleToken, "toRgx"> & { toRgx: () => RGXGroupedToken, readonly rgxGroupWrap: true  });

export type RGXTokenType = 'no-op' | 'literal' | 'native' | 'convertible' | 'class' | RGXTokenType[];
export type RGXTokenTypeFlat = Exclude<RGXTokenType, RGXTokenType[]> | "array";
export type RGXTokenTypeGuardInput = RGXTokenTypeFlat | null | RGXClassTokenConstructor | typeof RegExp | typeof ExtRegExp | typeof RGXTokenCollection | RGXTokenTypeGuardInput[];
export type RGXTokenFromType<T extends RGXTokenTypeGuardInput> =
    T extends null ? RGXToken :
    T extends 'no-op' ? RGXNoOpToken :
    T extends 'literal' ? RGXLiteralToken :
    T extends 'native' ? RGXNativeToken :
    T extends 'convertible' ? RGXConvertibleToken :
    T extends 'class' ? RGXClassToken :
    T extends 'array' ? RGXToken[] :
    T extends new (...args: unknown[]) => infer R ? R :
    T extends RGXTokenTypeGuardInput[] ? { [K in keyof T]: T[K] extends RGXTokenTypeGuardInput ? RGXTokenFromType<T[K]> : never } :
    never
;

export type RangeObject = {
    min?: number | null;
    max?: number | null;
    inclusiveLeft?: boolean;
    inclusiveRight?: boolean;
};

export const validRegexSymbol = Symbol('rgx.ValidRegex');
export type ValidRegexBrandSymbol = typeof validRegexSymbol;
export type ValidRegexString = Branded<string, [ValidRegexBrandSymbol]>;

export const validVanillaRegexFlagsSymbol = Symbol('rgx.ValidVanillaRegexFlags');
export type ValidVanillaRegexFlagsBrandSymbol = typeof validVanillaRegexFlagsSymbol;
export type ValidVanillaRegexFlags = Branded<string, [ValidVanillaRegexFlagsBrandSymbol]>;

export const validRegexFlagsSymbol = Symbol('rgx.ValidRegexFlags');
export type ValidRegexFlagsBrandSymbol = typeof validRegexFlagsSymbol;
export type ValidRegexFlags = Branded<string, [ValidRegexFlagsBrandSymbol]> | ValidVanillaRegexFlags;

export const validIdentifierSymbol = Symbol('rgx.ValidIdentifier');
export type ValidIdentifierBrandSymbol = typeof validIdentifierSymbol;
export type ValidIdentifier = Branded<string, [ValidIdentifierBrandSymbol]>;

export type RGXWOptions<R = unknown> = Omit<RGXWalkerOptions<R>, "startingSourcePosition"> & {
    multiline?: boolean;
};