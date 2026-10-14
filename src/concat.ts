import { assertValidRegexFlags } from "./ExtRegExp";
import { placeRGXToken, removeRedundantRegexGroups, scanOptionsFromFlags } from "./internal";
import { resolveRGXToken } from "./resolve";
import * as t from "./types";

// Wrapper for letting an array of tokens be resolved as a concatenation instead of a union.
export function rgxConcat(tokens: t.RGXToken[], groupWrap=true, currentFlags=''): t.ValidRegexString {
    assertValidRegexFlags(currentFlags);
    // Joining the resolved tokens can leave groups that are only redundant next to each other, such as "(?:a)(?:b)".
    const result = removeRedundantRegexGroups(
        // While a pattern is being built, each token is checked for acceptance at its position.
        tokens.map((token, i) => placeRGXToken(tokens, i, () => resolveRGXToken(token, {groupWrap, currentFlags}))).join(''),
        scanOptionsFromFlags(currentFlags)
    ) as t.ValidRegexString;
    return result;
}