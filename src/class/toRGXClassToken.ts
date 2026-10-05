import { RGXToken } from "src/types";
import { RGXClassToken } from "./base";
import { isRGXArrayToken, isRGXJSONObjectToken } from "src/typeGuards";
import { RGXClassUnionToken } from "./union";
import { RGXTokenCollection } from "src/collection";
import { RGXGroupToken } from "./group";
import { RGXClassWrapperToken } from "./wrapper";
import { rgxTokenFromJSON } from "src/json";

export function toRGXClassToken(token: RGXToken): RGXClassToken {
    // JSON class tokens become class tokens and JSON literal tokens become literal tokens (which get wrapped below).
    if (isRGXJSONObjectToken(token, false)) token = rgxTokenFromJSON(token);
    if (RGXClassToken.check(token)) return token;
    if (isRGXArrayToken(token)) return new RGXClassUnionToken(token);
    if (RGXTokenCollection.check(token) && token.mode === 'union') return new RGXClassUnionToken(token.tokens);
    if (RGXTokenCollection.check(token) && token.mode === 'concat') return new RGXGroupToken({capturing: false}, token);
    return new RGXClassWrapperToken(token);
}