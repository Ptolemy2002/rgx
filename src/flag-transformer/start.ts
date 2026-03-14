import { RegExpFlagTransformer } from "src/ExtRegExp";

export const beginningFlagTransformer: RegExpFlagTransformer = function (exp) {
    // Putting it in a group so that a union of patterns will be wrapped correctly,
    // e.g. "a|b" will become "^(?:a|b)" instead of "^a|b"
    return ["^(?:" + exp.source + ")", exp.flags];
};