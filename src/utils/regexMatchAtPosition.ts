import { assertInRange, RGXOutOfBoundsError } from "src/errors/outOfBounds";
import { regexWithFlags } from "./regexWithFlags";

export function regexMatchAtPosition(regex: RegExp, str: string, position: number): boolean {
    /*
        The y flag means sticky mode, which means the next match must start at
        lastIndex. By setting lastIndex to the position we want to check, we can test
        if the regex matches at that position.
    */
    assertInRange(position, {min: 0, max: str.length, inclusiveRight: false}, 'String index out of bounds');
    
    const stickyRegex = regexWithFlags(regex, "y");
    stickyRegex.lastIndex = position;
    return stickyRegex.test(str);
}