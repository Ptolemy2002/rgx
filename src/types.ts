import { Branded } from "@ptolemy2002/ts-brand-utils";
import type { RGXClassToken } from "./class";
import type { ExtRegExp } from "./ExtRegExp";
import type { RGXWalkerOptions } from "./walker";

export type RGXNoOpToken = null | undefined;
export type RGXLiteralToken = RegExp;
export type RGXNativeToken = string | number | boolean | RGXNoOpToken;
// Where a token is placed in a pattern that is being built.
export type RGXInsertionContext = {
    // The flags effective at this position, including the flags of enclosing modifier groups.
    readonly flags: ValidRegexFlags;
    // The tokens at the same level as this one, including this one.
    readonly siblings: readonly RGXToken[];
    // This token's position in siblings.
    readonly index: number;
    // The context of the enclosing level, or null at the top level of the pattern.
    readonly parent: RGXInsertionContext | null;
    // The token whose contents this level is, or null at the top level of the pattern.
    readonly container: RGXToken | null;
};

export type RGXConvertibleToken = {
    // currentFlags are the flags in effect where the token is placed, including the flags of enclosing modifier groups.
    toRgx: (currentFlags?: string) => RGXToken,
    rgxAcceptInsertion?: (context: RGXInsertionContext) => string | boolean,
    readonly rgxIsRepeatable?: boolean
};
// A raw source fragment that is inserted as-is, without escaping. Unlike a literal token, it doesn't have to be a valid
// regex on its own, so it may open a group that a later token closes (or close one that an earlier token opened).
export type RGXInterpolationToken = { readonly rgxInterpolation: string };

// The key that signals that a plain object is intended to be an RGX token in JSON form.
export const RGX_JSON_FLAG = "$rgx";
export type RGXJSONFlag = typeof RGX_JSON_FLAG;
export type RGXJSONPrimitive = string | number | boolean | null;
export type RGXJSONObject = { [key: string]: RGXJSONValue | undefined };
export type RGXJSONValue = RGXJSONPrimitive | RGXJSONValue[] | RGXJSONObject;

export type RGXJSONNativeToken = Exclude<RGXNativeToken, undefined>;
export type RGXJSONLiteralToken = { $rgx: true, source: string, flags?: string };
export type RGXJSONClassToken = { $rgx: true, class: string, args?: RGXJSONValue[] };
export type RGXJSONInterpolationToken = { $rgx: true, interpolation: string };
export type RGXJSONObjectToken = RGXJSONLiteralToken | RGXJSONClassToken | RGXJSONInterpolationToken;
export type RGXJSONToken = RGXJSONNativeToken | RGXJSONObjectToken | RGXJSONToken[];

export type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXInterpolationToken | RGXJSONObjectToken | RGXToken[];
export type RGXNonJSONToken = Exclude<RGXToken, RGXJSONObjectToken>;

export type RGXClassTokenConstructor = new (...args: unknown[]) => RGXClassToken;

// When rgxIsRepeatable is absent, the token is only repeatable if it isn't detected as consuming no characters, which types can't express.
export type RGXRepeatableConvertibleToken = RGXConvertibleToken & { readonly rgxIsRepeatable?: true };

export type RGXTokenType = 'no-op' | 'literal' | 'native' | 'convertible' | 'interpolation' | 'class' | 'json' | RGXTokenType[];
export type RGXTokenTypeFlat = Exclude<RGXTokenType, RGXTokenType[]> | "array";
export type RGXTokenTypeGuardInput = 
    "repeatable" |
    RGXTokenTypeFlat |
    null | RGXClassTokenConstructor |
    typeof RegExp |
    typeof ExtRegExp |
    RGXTokenTypeGuardInput[]
;
export type RGXTokenFromType<T extends RGXTokenTypeGuardInput, J extends boolean = true> =
    T extends null ? (J extends true ? RGXToken : RGXNonJSONToken) :
    T extends 'no-op' ? RGXNoOpToken :
    T extends 'literal' ? (J extends true ? RGXLiteralToken | RGXJSONLiteralToken : RGXLiteralToken) :
    T extends 'native' ? RGXNativeToken :
    T extends 'convertible' ? (J extends true ? RGXConvertibleToken | RGXJSONClassToken : RGXConvertibleToken) :
    T extends 'interpolation' ? (J extends true ? RGXInterpolationToken | RGXJSONInterpolationToken : RGXInterpolationToken) :
    T extends 'class' ? (J extends true ? RGXClassToken | RGXJSONClassToken : RGXClassToken) :
    T extends 'json' ? RGXJSONToken :
    T extends 'array' ? RGXToken[] :
    T extends 'repeatable' ? Exclude<RGXToken, RGXConvertibleToken | RGXJSONClassToken | RGXInterpolationToken | RGXJSONInterpolationToken> | RGXRepeatableConvertibleToken | (J extends true ? RGXJSONClassToken : never) :
    T extends new (...args: unknown[]) => infer R ? (J extends true ? R | RGXJSONClassToken : R) :
    T extends RGXTokenTypeGuardInput[] ? { [K in keyof T]: T[K] extends RGXTokenTypeGuardInput ? RGXTokenFromType<T[K], J> : never } :
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

export const validRegexLocalizableFlagsSymbol = Symbol('rgx.ValidRegexLocalizableFlags');
export type ValidRegexLocalizableFlagsBrandSymbol = typeof validRegexLocalizableFlagsSymbol;
export type ValidRegexLocalizableFlags = Branded<string, [ValidRegexLocalizableFlagsBrandSymbol]>;

export const validRegexLocalizableFlagDiffSymbol = Symbol('rgx.ValidRegexLocalizableFlagDiff');
export type ValidRegexLocalizableFlagDiffBrandSymbol = typeof validRegexLocalizableFlagDiffSymbol;
export type ValidRegexLocalizableFlagDiff = Branded<string, [ValidRegexLocalizableFlagDiffBrandSymbol]>;

export type RGXOptions = {
    multiline?: boolean;
    verbatim?: boolean;
};

export type RGXWOptions<R = unknown, S = unknown> = RGXWalkerOptions<R, S> & RGXOptions;