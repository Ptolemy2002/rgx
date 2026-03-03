import { assertInRange } from "src/errors/outOfBounds";
import { regexWithFlags } from "./regexWithFlags";
import { RGXRegexNotMatchedAtPositionError } from "src/errors";


export function regexMatchAtPosition(regex: RegExp, str: string, position: number, includeMatch: true): RegExpExecArray | null;
export function regexMatchAtPosition(regex: RegExp, str: string, position: number, includeMatch?: false): string | null;
export function regexMatchAtPosition(regex: RegExp, str: string, position: number, includeMatch = false): string | RegExpExecArray | null {
    /*
        The y flag means sticky mode, which means the next match must start at
        lastIndex. By setting lastIndex to the position we want to check, we can test
        if the regex matches at that position.
    */
    assertInRange(position, {min: 0, max: str.length, inclusiveRight: false}, 'String index out of bounds');

    const stickyRegex = regexWithFlags(regex, "y");
    stickyRegex.lastIndex = position;
    const match = stickyRegex.exec(str);

    return includeMatch ? match : (match ? match[0] : null);
}

export function doesRegexMatchAtPosition(regex: RegExp, str: string, position: number, includeMatch: true): RegExpExecArray | false;
export function doesRegexMatchAtPosition(regex: RegExp, str: string, position: number, includeMatch?: false): boolean;
export function doesRegexMatchAtPosition(regex: RegExp, str: string, position: number, includeMatch = false): boolean | RegExpExecArray {
    const match = regexMatchAtPosition(regex, str, position, true);
    if (includeMatch) return match ?? false;
    return match !== null;
}

export function assertRegexMatchesAtPosition(regex: RegExp, str: string, position: number, contextSize?: number | null, includeMatch?: false): string;
export function assertRegexMatchesAtPosition(regex: RegExp, str: string, position: number, contextSize: number | null | undefined, includeMatch: true): RegExpExecArray;
export function assertRegexMatchesAtPosition(regex: RegExp, str: string, position: number, contextSize: number | null = 10, includeMatch = false): string | RegExpExecArray {
    const result = regexMatchAtPosition(regex, str, position, true);

    if (result === null) {
        throw new RGXRegexNotMatchedAtPositionError("Regex not matched at index", regex, str, position, contextSize);
    }

    return includeMatch ? result : result[0];
}