import * as t from "./types";
import { rgxClassInit } from "./class";
import { registerCustomFlagTransformers } from "./flag-transformer";
import { registerBuiltInRGXPatternTransformers } from "./pattern-transformer";
import { rgxConcat } from "./concat";
import { collectRGXReferences, withRGXInsertionRoot } from "./internal/insertionContext";
import { removeRedundantRegexGroups } from "./internal/analyzeRegexSource";
import { scanOptionsFromFlags } from "./internal/scanRegexSource";
import { assertValidRegexReferences } from "./internal/validateReferences";
import { rgxMergeWalkerSteps, rgxTaggedTemplateToArray } from "./internal/taggedTemplateToArray";
import { assertValidRegexFlags, ExtRegExp } from "./ExtRegExp";
import { RGXWalker, RGXWalkerStep } from "./walker";
import { validateRGXWalkerSteps } from "./walker/base";
import { createRegex } from "./utils/createRegex";

// Call this for certain class methods to work correctly
rgxClassInit();
// Call this for our custom flags to work correctly
registerCustomFlagTransformers();
// Call this for patterns to work around known regex engine bugs
registerBuiltInRGXPatternTransformers();

export function rgxa(tokens: t.RGXToken[], flags: string = ''): ExtRegExp {
    assertValidRegexFlags(flags);
    // Insertions are checked while the pattern is built.
    const [concatenated, references] = collectRGXReferences(() => withRGXInsertionRoot(flags, () => rgxConcat(tokens, true, flags)));
    // Nothing else is added to the final pattern, so groups at its edges can be removed too.
    const scanOptions = scanOptionsFromFlags(flags);
    const pattern = removeRedundantRegexGroups(concatenated, { ...scanOptions, isolated: true });
    // The pattern is finished, so every group a backreference could point to is in it.
    assertValidRegexReferences(pattern, references, scanOptions);
    return createRegex(pattern, flags, true);
}

export default function rgx(flags: string = '', {multiline=true, verbatim=true}: t.RGXOptions = {}) {
    return (strings: TemplateStringsArray, ...tokens: t.RGXToken[]) => {
        // It is safe to assert the result because we know there will be no parts passed in here.
        return rgxa(rgxTaggedTemplateToArray(strings, tokens, multiline, verbatim) as t.RGXToken[], flags);
    };
}

export function rgxwa<R = unknown, S = unknown, T = unknown>(
    source: string, tokens: RGXWalkerStep<R, S, T>[],
    {mergeSteps=false, ...options}: Omit<t.RGXWOptions<R, S>, "multiline"> = {}
) {
    const steps = mergeSteps ? rgxMergeWalkerSteps(tokens) : tokens;
    // Steps are checked when the walker is created, so problems are found before walking starts.
    validateRGXWalkerSteps(steps);
    return new RGXWalker<R, S>(source, steps, options);
}

export function rgxw<R = unknown, S = unknown, T = unknown>(source: string, {multiline=true, verbatim=true, ...options}: t.RGXWOptions<R, S> = {}) {
    return (strings: TemplateStringsArray, ...tokens: RGXWalkerStep<R, S, T>[]) => {
        return rgxwa<R, S, T>(source, rgxTaggedTemplateToArray(strings, tokens, multiline, verbatim), options);
    };
}

// Do all exports after to avoid circular dependencies issues.
export * from "./errors";
export * from "./types";
export * from "./typeGuards";
export * from "./class";
export * from "./resolve";
export * from "./json";
export * from "./concat";
export * from "./utils";
export * from "./ExtRegExp";
export * from "./flag-transformer";
export * from "./pattern-transformer";
export * from "./clone";
export * from "./constants";
export * from "./walker";
export * from "./lexer";
export * from "./parse";
