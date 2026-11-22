import { RGXInvalidTokenError } from "src/errors";
import { RGXCapture } from "src/walker";
import { RGXClassToken } from "./base";

export type RGXTokenParseOptions = {
    // The flags the token is matched with. Only the localizable flags (i, m and s) change what a parse pass matches.
    flags?: string;
    // Whether the text is already known to be a match of the token, which skips checking it against the token's pattern.
    matched?: boolean;
};

// A class token that resolves to a pattern without captures for its parts, and reads those parts out of the text it
// matched with a parse pass, such as RGXListToken and RGXPermutationToken.
export interface RGXParsableToken<T = unknown> extends RGXClassToken {
    // Walks text the token matched, returning a capture for each part of it.
    parse(text: string, options?: RGXTokenParseOptions): RGXCapture<T>[];
    // Whether the token's pattern, with flags, matches all of text.
    matchesWhole(text: string, flags?: string): boolean;
}

export function isRGXParsableToken<T = unknown>(value: unknown): value is RGXParsableToken<T> {
    return value instanceof RGXClassToken
        && typeof (value as Partial<RGXParsableToken>).parse === "function"
        && typeof (value as Partial<RGXParsableToken>).matchesWhole === "function";
}

export function assertRGXParsableToken<T = unknown>(value: unknown): asserts value is RGXParsableToken<T> {
    if (!isRGXParsableToken(value)) {
        throw new RGXInvalidTokenError("Invalid parsable token", { type: "custom", values: ["class token with parse and matchesWhole methods"] }, value);
    }
}
