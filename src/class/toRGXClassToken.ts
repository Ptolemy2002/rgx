import { RGXToken } from "src/types";
import { RGXClassToken } from "./base";
import { isRGXArrayToken } from "src/typeGuards";
import { RGXClassUnionToken } from "./union";
import { RGXTokenCollection } from "src/collection";
import { RGXGroupToken } from "./group";
import { RGXClassWrapperToken } from "./wrapper";

export function toRGXClassToken(token: RGXToken): RGXClassToken {
    if (RGXClassToken.check(token)) return token;
    if (isRGXArrayToken(token)) return new RGXClassUnionToken(token);
    if (RGXTokenCollection.check(token) && token.mode === 'union') return new RGXClassUnionToken(token.tokens);
    if (RGXTokenCollection.check(token) && token.mode === 'concat') return new RGXGroupToken({capturing: false}, token);
    return new RGXClassWrapperToken(token);
}