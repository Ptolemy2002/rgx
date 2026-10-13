import { assertValidRegexFlags } from "./ExtRegExp";
import { assureAcceptance, removeRedundantRegexGroups, scanOptionsFromFlags } from "./internal";
import { resolveRGXToken } from "./resolve";
import * as t from "./types";

// Wrapper for letting an array of tokens be resolved as a concatenation instead of a union.
export function rgxConcat(tokens: t.RGXToken[], groupWrap=true, currentFlags=''): t.ValidRegexString {
    assertValidRegexFlags(currentFlags);
    // Joining the resolved tokens can leave groups that are only redundant next to each other, such as "(?:a)(?:b)".
    const result = removeRedundantRegexGroups(
        tokens.map(t => resolveRGXToken(t, {groupWrap, currentFlags})).join(''),
        scanOptionsFromFlags(currentFlags)
    ) as t.ValidRegexString;
    assureAcceptance(tokens, currentFlags);
    return result;
}