import { RGXToken } from "src/types";
import { RGXClassToken } from "./base";
import { isRGXArrayToken, isRGXJSONObjectToken } from "src/typeGuards";
import { RGXClassUnionToken } from "./union";
import { RGXClassWrapperToken } from "./wrapper";
import { rgxTokenFromJSON } from "src/json";

export function toRGXClassToken(token: RGXToken): RGXClassToken {
    // JSON class tokens become class tokens and JSON literal tokens become literal tokens (which get wrapped below).
    if (isRGXJSONObjectToken(token, false)) token = rgxTokenFromJSON(token);
    if (RGXClassToken.check(token)) return token;
    // The members aren't checked, since that would call the toRgx() of each convertible member just for the check.
    // Invalid members are caught when the union is resolved, as they would be inside a wrapper.
    if (isRGXArrayToken(token, false)) return new RGXClassUnionToken(token);
    return new RGXClassWrapperToken(token);
}