# Type Reference
The following is a reference of all types publicly exported by this library, along with imports from dependencies that are used within these types.

```typescript
import { Branded } from "@ptolemy2002/ts-brand-utils";
import { CloneDepth } from "@ptolemy2002/immutability-utils";
// type CloneDepth = number | "max";

type RGXNoOpToken = null | undefined;
type RGXLiteralToken = RegExp;
type RGXNativeToken = string | number | boolean | RGXNoOpToken;
type RGXConvertibleToken = {
    toRgx: () => RGXToken,
    rgxAcceptInsertion?: (tokens: RGXToken[], flags: ValidRegexFlags) => string | boolean,
    readonly rgxGroupWrap?: boolean,
    readonly rgxIsGroup?: boolean,
    readonly rgxIsRepeatable?: boolean
};
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXToken[];

type RGXClassTokenConstructor = new (...args: unknown[]) => RGXClassToken;
type RGXGroupedToken = RGXToken[] | RGXLiteralToken | RGXGroupedConvertibleToken;
type RGXGroupedConvertibleToken = (RGXConvertibleToken & { readonly rgxIsGroup: true }) | (Omit<RGXConvertibleToken, "toRgx"> & { toRgx: () => RGXGroupedToken, readonly rgxGroupWrap: true  });
type RGXRepeatableConvertibleToken = RGXConvertibleToken & { readonly rgxIsRepeatable: true | undefined };

const validRegexSymbol = Symbol('rgx.ValidRegex');
type ValidRegexBrandSymbol = typeof validRegexSymbol;
type ValidRegexString = Branded<string, [ValidRegexBrandSymbol]>;

const validVanillaRegexFlagsSymbol = Symbol('rgx.ValidVanillaRegexFlags');
type ValidVanillaRegexFlagsBrandSymbol = typeof validVanillaRegexFlagsSymbol;
type ValidVanillaRegexFlags = Branded<string, [ValidVanillaRegexFlagsBrandSymbol]>;

const validRegexFlagsSymbol = Symbol('rgx.ValidRegexFlags');
type ValidRegexFlagsBrandSymbol = typeof validRegexFlagsSymbol;
type ValidRegexFlags = Branded<string, [ValidRegexFlagsBrandSymbol]> | ValidVanillaRegexFlags;

type RegExpFlagTransformer = (exp: RegExp) => RegExp;

const validIdentifierSymbol = Symbol('rgx.ValidIdentifier');
type ValidIdentifierBrandSymbol = typeof validIdentifierSymbol;
type ValidIdentifier = Branded<string, [ValidIdentifierBrandSymbol]>;

type RGXTokenType = 'no-op' | 'literal' | 'native' | 'convertible' | 'class' | RGXTokenType[];
type RGXTokenTypeFlat = Exclude<RGXTokenType, RGXTokenType[]> | "array";
type RGXTokenTypeGuardInput = 
    // A union of all possible inputs that can be used to specify token types in type guards, including:
    // - The string literals corresponding to the basic token types, e.g. 'no-op', 'literal', etc.
    // - null, which can be used to indicate any token type
    // - Constructors for class tokens, RGXWalker, and RGXPart
    // - The RegExp and ExtRegExp constructors, which can be used to indicate literal tokens
    // - RGXTokenCollection, which can be used to indicate arrays of tokens
    // - "repeatable", which can be used to indicate any token that is repeatable (i.e. has rgxIsRepeatable true or does not specify rgxIsRepeatable)
    // - Arrays of any of the above, allowing for nested token type specifications
;

type RGXTokenFromType<T extends RGXTokenTypeGuardInput> =
    // Maps token type strings to their corresponding types, e.g.:
    // 'no-op' -> RGXNoOpToken, 'literal' -> RGXLiteralToken, etc.
    // Also maps any constructor to InstanceType<T>,
    // and preserves tuple types for constant arrays.
    // ... see source for full definition
;

type RGXErrorCode =
    // A series of string literals representing the codes
    // an RGXError can have, e.g. "INVALID_TOKEN_TYPE",
    // "INVALID_REGEX_FLAGS", etc. See src/errors/base.ts
    // for the full list of error codes.
;

type RangeObject = {
    min?: number | null;
    max?: number | null;
    inclusiveLeft?: boolean;
    inclusiveRight?: boolean;
};
type ExpectedTokenType = {
    type: "tokenType";
    values: RGXTokenTypeFlat[];
} | {
    type: "custom";
    values: string[];
};
type RGXTokenCollectionMode = 'union' | 'concat';
type RGXTokenCollectionInput = RGXToken | RGXTokenCollection;

type RGXUnionInsertionPosition = 'prefix' | 'suffix';

type RGXGroupTokenArgs = {
    name?: string | null;
    capturing?: boolean;
};

type RGXPartControl = "skip" | "stop" | "silent" | void;

type RGXCapture<T = unknown> = {
    raw: string;
    value: T;
    start: number;
    end: number;
    ownerId: string | null;
    branch: number;
};

type RGXPartOptions<R, T=string> = {
    id: string;
    rawTransform: (captured: string) => string;
    transform: (captured: string) => T;
    validate: (captured: RGXCapture<T>, part: RGXPart<R, T>, walker: RGXWalker<R>) => boolean | string;
    beforeCapture: ((part: RGXPart<R, T>, walker: RGXWalker<R>) => RGXPartControl) | null;
    afterCapture: ((capture: RGXCapture<T>, part: RGXPart<R, T>, walker: RGXWalker<R>) => void) | null;
};

type RGXWalkerOptions<R> = {
    startingSourcePosition?: number;
    reduced?: R;
    infinite?: boolean;
    looping?: boolean;
};

type RGXWOptions<R = unknown> = RGXWalkerOptions<R> & {
    multiline?: boolean;
};

// See src/constants.ts for the actual mapping of predefined constant names to their token values
type RGXPredefinedConstant = keyof typeof RGX_PREDEFINED_CONSTANTS;
type RGXConstantName = RGXPredefinedConstant | (string & {});
```