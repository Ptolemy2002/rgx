import { assertInRange, RGXOutOfBoundsError } from "src/errors/outOfBounds";
import { regexWithFlags } from "./regexWithFlags";
import { RGXRegexNotMatchedAtPositionError } from "src/errors";

export function regexMatchAtPosition(regex: RegExp, str: string, position: number): string | null {
    /*
        The y flag means sticky mode, which means the next match must start at
        lastIndex. By setting lastIndex to the position we want to check, we can test
        if the regex matches at that position.
    */
    assertInRange(position, {min: 0, max: str.length, inclusiveRight: false}, 'String index out of bounds');
    
    const stickyRegex = regexWithFlags(regex, "y");
    stickyRegex.lastIndex = position;
    const match = stickyRegex.exec(str);
    return match ? match[0] : null;
}

export function doesRegexMatchAtPosition(regex: RegExp, str: string, position: number): boolean {
    return regexMatchAtPosition(regex, str, position) !== null;
}

export function assertRegexMatchesAtPosition(regex: RegExp, str: string, position: number, contextSize: number | null = 10) {
    const result = regexMatchAtPosition(regex, str, position);
    
    if (result === null) {
        throw new RGXRegexNotMatchedAtPositionError("Regex not matched at index", regex, str, position, contextSize);
    }

    return result;
}