import { RGXToken } from "src/types";
import { RGXNotSupportedError } from "src/errors";
import { RGXGroupToken } from "src/class/group";
import { RGXPart, RGXWalkerStep } from "src/walker";
import { ExtRegExp } from "src/ExtRegExp";
import { createRegex } from "src/utils/createRegex";
import { resolveRGXToken } from "src/resolve";
import { resolveFinishedRGXSource } from "src/internal/exactMarkers";

// An item alternative of a token that parses its own text, such as RGXListToken: a part, whose options apply to the
// item when the text is parsed, or a plain token, whose items are the text it matched.
type RGXItemAlternative = RGXPart<any, any, any> | RGXToken;

// The localizable flags (i, m and s) in flags, which are the only ones that change what a walker matches.
export function localizableRGXParseFlags(flags: string): string {
    return [..."ims"].filter(flag => flags.includes(flag)).join("");
}

// The token each item alternative is matched with. Dynamic parts produce their token from a walker's state, which a
// pattern doesn't have. what names the kind of item in the error.
export function rgxItemTokens(items: readonly RGXItemAlternative[], what: string): RGXToken[] {
    return items.map(item => {
        if (!RGXPart.check(item)) return item as RGXToken;
        const part = item.target();
        if (part.isDynamic()) throw new RGXNotSupportedError(`Dynamic parts as ${what}`, `A ${what.replace(/s$/, "")}'s token has to be known without a walker.`);
        return part.token as RGXToken;
    });
}

// Wraps a token in a group that sets flags, unless there are none.
export function rgxTokenWithParseFlags(token: RGXToken, flags: string): RGXToken {
    return flags === "" ? token : new RGXGroupToken({ capturing: false, flags }, [token]);
}

// The walker step the item alternatives are parsed with: the only one, or a union of them, so the branch of each capture
// is the index of the alternative that matched it (unless there is only one). With flags, each token is put in a group
// that sets them, and each part is matched through a copy with the same options.
export function rgxItemParseStep(items: readonly RGXItemAlternative[], flags: string, what: string): RGXWalkerStep<null> {
    const tokens = rgxItemTokens(items, what);

    const alternatives = items.map((item, i): RGXWalkerStep<null> => {
        if (!RGXPart.check(item)) return rgxTokenWithParseFlags(tokens[i], flags);
        if (flags === "") return item as RGXPart<null>;

        const part = item.target() as RGXPart<null, unknown, unknown>;
        return new RGXPart<null, unknown, unknown>(rgxTokenWithParseFlags(tokens[i], flags), {
            id: part.id ?? undefined,
            rawTransform: part.rawTransform,
            transform: part.transform,
            validate: (capture, context) => { part.validate(capture, { part, walker: context.walker }); return true; },
            beforeCapture: part.beforeCapture,
            afterCapture: part.afterCapture,
            afterFailure: part.afterFailure,
            afterValidationFailure: part.afterValidationFailure,
            afterLoss: part.afterLoss,
        });
    });

    return alternatives.length === 1 ? alternatives[0]! : alternatives;
}

// A part matching a token without being recorded, such as a separator.
export function rgxSilentParseStep(token: RGXToken, flags: string): RGXPart<null> {
    return new RGXPart<null>(rgxTokenWithParseFlags(token, flags), { beforeCapture: () => "silent" });
}

// A regex that matches only text that a token matches as a whole, with the given flags, for checking the text a token's
// parse pass is given. Lookarounds anchor it, since ^ and $ match at line breaks with the m flag.
export function rgxWholeTextRegex(token: RGXToken, flags: string): ExtRegExp {
    const source = resolveFinishedRGXSource(() => resolveRGXToken(token));
    return createRegex(`(?<![\\s\\S])(?:${source})(?![\\s\\S])`, flags, true);
}

// Caches the whole-text regex of a token for each set of flags, rebuilding it when the values it was built from change.
export class RGXWholeTextRegexCache {
    private entries = new Map<string, { key: readonly unknown[]; regex: ExtRegExp }>();

    get(token: RGXToken, flags: string, key: readonly unknown[]): ExtRegExp {
        const entry = this.entries.get(flags);
        if (entry !== undefined && entry.key.length === key.length && entry.key.every((value, i) => value === key[i])) return entry.regex;
        const regex = rgxWholeTextRegex(token, flags);
        this.entries.set(flags, { key: [...key], regex });
        return regex;
    }
}
