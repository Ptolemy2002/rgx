import { resolveRGXToken } from "./resolve";
import * as t from "./types";

// Wrapper for letting an array of tokens be resolved as a concatenation instead of a union.
export function rgxConcat(tokens: t.RGXToken[], groupWrap=true): t.ValidRegexString {
    return tokens.map(t => resolveRGXToken(t, groupWrap)).join('') as t.ValidRegexString;
}