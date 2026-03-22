import { assertInRange } from "src/errors/outOfBounds";
import { regexWithFlags } from "./regexWithFlags";
import { RGXRegexNotMatchedAfterPositionError } from "src/errors";

export function regexMatchAfterPosition(regex: RegExp, str: string, position: number, includeMatch: true): [number, RegExpExecArray] | null;
export function regexMatchAfterPosition(regex: RegExp, str: string, position: number, includeMatch?: false): [number, string] | null;
export function regexMatchAfterPosition(regex: RegExp, str: string, position: number, includeMatch = false): [number, string] | [number, RegExpExecArray] | null {
    /*
        The g flag means global mode, which searches forward from lastIndex rather
        than requiring a match exactly there (as the y/sticky flag does). By setting
        lastIndex to the position we want to search from, exec will find the next
        match at or after that position.
    */
    assertInRange(position, { min: 0, max: str.length, inclusiveRight: false }, 'String index out of bounds');

    const globalRegex = regexWithFlags(regex, "g");
    globalRegex.lastIndex = position;
    const match = globalRegex.exec(str);

    return match ? (includeMatch ? [match.index, match] : [match.index, match[0]]) : null;
}

export function doesRegexMatchAfterPosition(regex: RegExp, str: string, position: number, includeMatch: true): [number, RegExpExecArray] | false;
export function doesRegexMatchAfterPosition(regex: RegExp, str: string, position: number, includeMatch?: false): boolean;
export function doesRegexMatchAfterPosition(regex: RegExp, str: string, position: number, includeMatch = false): boolean | [number, RegExpExecArray] {
    const match = regexMatchAfterPosition(regex, str, position, true);
    if (includeMatch) return match ?? false;
    return match !== null;
}

export function assertRegexMatchesAfterPosition(regex: RegExp, str: string, position: number, contextSize?: number | null, includeMatch?: false): [number, string];
export function assertRegexMatchesAfterPosition(regex: RegExp, str: string, position: number, contextSize: number | null | undefined, includeMatch: true): [number, RegExpExecArray];
export function assertRegexMatchesAfterPosition(regex: RegExp, str: string, position: number, contextSize: number | null = 10, includeMatch = false): [number, string] | [number, RegExpExecArray] {
    const result = regexMatchAfterPosition(regex, str, position, true);

    if (result === null) {
        throw new RGXRegexNotMatchedAfterPositionError("Regex not matched after index", regex, str, position, contextSize);
    }

    return includeMatch ? result : [result[0], result[1][0]];
}
