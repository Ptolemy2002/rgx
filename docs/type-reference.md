# Type Reference
The following is a reference of all types publicly exported by this library, along with imports from dependencies that are used within these types.

```typescript
import { Branded } from "@ptolemy2002/ts-brand-utils";
import { CloneDepth } from "@ptolemy2002/immutability-utils";
// type CloneDepth = number | "max";

type RGXNoOpToken = null | undefined;
type RGXLiteralToken = RegExp;
type RGXNativeToken = string | number | boolean | RGXNoOpToken;
type RGXInsertionContext = {
    readonly flags: ValidRegexFlags;              // effective at this position, including enclosing modifier groups
    readonly siblings: readonly RGXToken[];       // the tokens at the same level, including this one
    readonly index: number;                       // this token's position in siblings
    readonly parent: RGXInsertionContext | null;  // the enclosing level, or null at the top level
    readonly container: RGXToken | null;          // the token whose contents this level is, or null at the top level
};
type RGXConvertibleToken = {
    toRgx: () => RGXToken,
    rgxAcceptInsertion?: (context: RGXInsertionContext) => string | boolean,
    readonly rgxIsRepeatable?: boolean
};
type RGXInterpolationToken = { readonly rgxInterpolation: string };
type RGXJSONPrimitive = string | number | boolean | null;
type RGXJSONObject = { [key: string]: RGXJSONValue | undefined };
type RGXJSONValue = RGXJSONPrimitive | RGXJSONValue[] | RGXJSONObject;
type RGXJSONNativeToken = Exclude<RGXNativeToken, undefined>;
type RGXJSONLiteralToken = { $rgx: true, source: string, flags?: string };
type RGXJSONClassToken = { $rgx: true, class: string, args?: RGXJSONValue[] };
type RGXJSONInterpolationToken = { $rgx: true, interpolation: string };
type RGXJSONObjectToken = RGXJSONLiteralToken | RGXJSONClassToken | RGXJSONInterpolationToken;
type RGXJSONToken = RGXJSONNativeToken | RGXJSONObjectToken | RGXJSONToken[];
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXInterpolationToken | RGXJSONObjectToken | RGXToken[];
type RGXNonJSONToken = Exclude<RGXToken, RGXJSONObjectToken>;
const RGX_JSON_FLAG = "$rgx";
type RGXJSONFlag = typeof RGX_JSON_FLAG;
type RGXTokenOrPart<R, S = unknown, T = any> = RGXToken | RGXPart<R, S, T>;

type RGXClassTokenConstructor = new (...args: unknown[]) => RGXClassToken;
// When rgxIsRepeatable is absent, the token is only repeatable if it isn't detected as consuming no characters, which types can't express.
type RGXRepeatableConvertibleToken = RGXConvertibleToken & { readonly rgxIsRepeatable?: true };

const validRegexSymbol = Symbol('rgx.ValidRegex');
type ValidRegexBrandSymbol = typeof validRegexSymbol;
type ValidRegexString = Branded<string, [ValidRegexBrandSymbol]>;

const validVanillaRegexFlagsSymbol = Symbol('rgx.ValidVanillaRegexFlags');
type ValidVanillaRegexFlagsBrandSymbol = typeof validVanillaRegexFlagsSymbol;
type ValidVanillaRegexFlags = Branded<string, [ValidVanillaRegexFlagsBrandSymbol]>;

const validRegexFlagsSymbol = Symbol('rgx.ValidRegexFlags');
type ValidRegexFlagsBrandSymbol = typeof validRegexFlagsSymbol;
type ValidRegexFlags = Branded<string, [ValidRegexFlagsBrandSymbol]> | ValidVanillaRegexFlags;

type RegExpFlagTransformer = (exp: RegExp) => [string, string];

const validIdentifierSymbol = Symbol('rgx.ValidIdentifier');
type ValidIdentifierBrandSymbol = typeof validIdentifierSymbol;
type ValidIdentifier = Branded<string, [ValidIdentifierBrandSymbol]>;

const validRegexLocalizableFlagsSymbol = Symbol('rgx.ValidRegexLocalizableFlags');
type ValidRegexLocalizableFlagsBrandSymbol = typeof validRegexLocalizableFlagsSymbol;
type ValidRegexLocalizableFlags = Branded<string, [ValidRegexLocalizableFlagsBrandSymbol]>;

const validRegexLocalizableFlagDiffSymbol = Symbol('rgx.ValidRegexLocalizableFlagDiff');
type ValidRegexLocalizableFlagDiffBrandSymbol = typeof validRegexLocalizableFlagDiffSymbol;
type ValidRegexLocalizableFlagDiff = Branded<string, [ValidRegexLocalizableFlagDiffBrandSymbol]>;

type RGXTokenType = 'no-op' | 'literal' | 'native' | 'convertible' | 'interpolation' | 'class' | 'json' | RGXTokenType[];
type RGXTokenTypeFlat = Exclude<RGXTokenType, RGXTokenType[]> | "array";
type RGXTokenTypeGuardInput = 
    // A union of all possible inputs that can be used to specify token types in type guards, including:
    // - The string literals corresponding to the basic token types, e.g. 'no-op', 'literal', etc.
    // - null, which can be used to indicate any token type
    // - Constructors for class tokens
    // - The RegExp and ExtRegExp constructors, which can be used to indicate literal tokens
    // - RGXTokenCollection, which can be used to indicate arrays of tokens
    // - "repeatable", which can be used to indicate any token that is repeatable (see isRGXToken in type-guards.md)
    // - "json", which can be used to indicate any JSON token (native, JSON object token, or array of JSON tokens)
    // - Arrays of any of the above, allowing for nested token type specifications
;

type RGXTokenFromType<T extends RGXTokenTypeGuardInput, J extends boolean = true> =
    // Maps token type strings to their corresponding types, e.g.:
    // 'no-op' -> RGXNoOpToken, 'literal' -> RGXLiteralToken, 'json' -> RGXJSONToken, etc.
    // Also maps any constructor to InstanceType<T>,
    // and preserves tuple types for constant arrays.
    // When J (whether JSON tokens are accepted) is true, the JSON counterpart is included
    // where one exists, e.g. 'literal' -> RGXLiteralToken | RGXJSONLiteralToken,
    // 'class' -> RGXClassToken | RGXJSONClassToken, and constructors -> InstanceType<T> | RGXJSONClassToken.
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
    flags?: string;
};

type RGXPartControl = "skip" | "stop" | "silent" | "stop-silent" | void;
type RGXWalkerStepDirective = "stop" | "skip" | "silent";

type RGXCapture<T = unknown> = {
    raw: string;
    value: T;
    start: number;
    end: number;
    ownerId: string | null; // The id of the RGXPart that captured this, if any
    branch: number; // The branch index of the token that captured this, or 0 if there is only one branch
    groups: Record<string, string> | null; // The groups captured by the token that captured this, or null if the token didn't capture any groups
};

type RGXPartContext<R, S = unknown, T = string> = {
    part: RGXPart<R, S, T>;
    walker: RGXWalker<R, S>;
};

type RGXPartOptions<R, S = unknown, T=string> = {
    id: string;
    rawTransform: (captured: string) => string;
    transform: (captured: string) => T;
    validate: (captured: RGXCapture<T>, context: RGXPartContext<R, S, T>) => boolean | string;
    beforeCapture: ((context: RGXPartContext<R, S, T>) => RGXPartControl) | null;
    afterCapture: ((capture: RGXCapture<T>, context: RGXPartContext<R, S, T>) => RGXPartControl) | null;
    afterFailure: ((e: RGXRegexNotMatchedAtPositionError | RGXRegexNotMatchedAfterPositionError, context: RGXPartContext<R, S, T>) => RGXPartControl) | null;
    afterValidationFailure: ((e: RGXPartValidationFailedError, context: RGXPartContext<R, S, T>) => RGXPartControl) | null;
};

type RGXWalkerOptions<R, S = unknown> = {
    startingSourcePosition?: number;
    reduced?: R;
    share?: S;
    infinite?: boolean;
    looping?: boolean;
    contiguous?: boolean;
};

type RGXTryWalkOptions = {
    revertReduced?: boolean;
    revertShare?: boolean;
    revertCaptures?: boolean;
};

type RGXJSONClassArgsParser<A extends unknown[]> = (args: RGXJSONValue[]) => A | string;
type RGXJSONClassConstructor = (args: RGXJSONValue[]) => RGXClassToken;
type RGXJSONClassTokenConstructor = {
    fromJSON: (json: RGXJSONClassToken) => RGXClassToken;
};
type RGXJSONBuiltinClassName =
    "RGXClassWrapperToken" | "RGXClassUnionToken" | "RGXGroupToken" | "RGXRepeatToken" |
    "RGXLookaheadToken" | "RGXLookbehindToken" | "RGXExclusionToken" | "RGXSubpatternToken";
type RGXJSONClassName = RGXJSONBuiltinClassName | (string & {});
type RGXTokenToJSONOptions = {
    resolveConvertible?: boolean;
};

type ResolveRGXTokenOptions = {
    groupWrap?: boolean;
    topLevel?: boolean;
    currentFlags?: string;
};

type RGXOptions = {
    multiline?: boolean;
    verbatim?: boolean;
};

type RGXWOptions<R = unknown, S = unknown> = RGXWalkerOptions<R, S> & RGXOptions;

type CreateRGXBoundsOptions = {
    flags?: string;
    anchorStart?: boolean;
    anchorEnd?: boolean;
    inner?: boolean;
};

// See src/constants.ts for the actual mapping of predefined constant names to their token values
type RGXPredefinedConstant = keyof typeof RGX_PREDEFINED_CONSTANTS;
type RGXConstantName = RGXPredefinedConstant | (string & {});

type LexemeNotMatchedCauseError = RGXRegexNotMatchedAtPositionError | RGXRegexNotMatchedAfterPositionError | RGXPartValidationFailedError;
type LexemeNotMatchedCause = {
    id: string;
    error: LexemeNotMatchedCauseError;
};

type RGXLexemeLocation = {
    index: number;
    line: number;
    column: number;
};

type RGXLexeme<Data> = {
    id: string;
    raw: string;
    start: RGXLexemeLocation;
    end: RGXLexemeLocation;
    data?: Data;
};

type RGXLexemeDefinition<Data, Share=unknown> = Readonly<({
    type: "resolve";
    token: RGXToken;
} | {
    type: "walk";
    tokens: RGXTokenOrPart<Data, Share>[];
    options?: Omit<RGXWalkerOptions<Data, Share>, "startingSourcePosition" | "reduced" | "share"> & {
        reduced?: (() => Data) | null;
        share?: (() => Share) | null;
    };
}) & {
    id: string;
    priority?: number;
}>;

type RGXLexemeDefinitions<Data, Share=unknown> = Readonly<Record<string, ReadonlyArray<RGXLexemeDefinition<Data, Share>>>>;
```