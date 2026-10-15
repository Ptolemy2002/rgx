import { RGXInvalidRegexStringError } from "src/errors";
import { ValidRegexString } from "src/types";

// The flags a piece of a pattern is compiled with: the localizable flags (which change what it matches) and the
// unicode flags (which change how it is read) in effect where it is placed. Custom flags never use these letters.
export function regexPieceFlags(currentFlags: string): string {
    return [..."imsuv"].filter(flag => currentFlags.includes(flag)).join("");
}

// Compiles a piece of a pattern with the flags in effect where it is placed. A token's toRgx() returns its pieces this
// way, so the resolver sees that they already have the flags around them and leaves those flags alone.
//
// A piece only has to be valid with one of the unicode modes (no flag, u, or v), trying the one in effect first. With
// the u or v flag, some pieces aren't valid on their own (such as a backreference to a group outside of the piece),
// and a piece resolved outside of a pattern (such as while detecting whether a token is repeatable) may contain a
// literal token that is only valid with its own u or v flag. The whole pattern is checked with its real flags once it
// is built.
export function createRegexPiece(source: string, currentFlags: string = ""): RegExp {
    const flags = regexPieceFlags(currentFlags);
    const localizableFlags = flags.replaceAll(/[uv]/g, "");
    const candidates = [...new Set([flags, localizableFlags, localizableFlags + "u", localizableFlags + "v"])];

    let firstError: SyntaxError | null = null;
    for (const candidate of candidates) {
        try {
            return new RegExp(source, candidate);
        } catch (err) {
            // This is ignored because I don't know what kind of
            // unexpected errors might happen.
            /* istanbul ignore if */
            if (!(err instanceof SyntaxError)) throw err;
            firstError ??= err;
        }
    }

    // The error from the flags in effect is the most relevant one.
    throw new RGXInvalidRegexStringError("Invalid regex string", source, firstError!);
}

export function assertValidRegexPiece(source: string, currentFlags: string = ""): asserts source is ValidRegexString {
    createRegexPiece(source, currentFlags);
}
