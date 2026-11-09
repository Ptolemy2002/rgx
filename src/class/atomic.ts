import { RGXInsertionContext, RGXToken } from "src/types";
import { RGXLookbehindToken } from "./lookbehind";
import { isRGXJSONClassToken } from "src/typeGuards";

function isLookbehind(token: RGXToken | null): boolean {
    if (RGXLookbehindToken.check(token)) return true;
    // JSON class tokens are placed before they are converted.
    return isRGXJSONClassToken(token, false) && token.class === "RGXLookbehindToken";
}

// Atomic groups (see the atomic option of RGXGroupToken) are emulated with a capture followed by a backreference to
// it. Lookbehinds match from right to left, so the backreference would be matched before the capture there.
export function rejectRGXAtomicInLookbehind(context: RGXInsertionContext): string | true {
    for (let current: RGXInsertionContext | null = context; current !== null; current = current.parent) {
        if (isLookbehind(current.container)) return "Atomic groups can't be placed inside a lookbehind, since they are emulated with a backreference that a lookbehind would match before its group.";
    }
    return true;
}
