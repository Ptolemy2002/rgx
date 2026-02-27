import { CloneDepth, extClone, depthDecrement } from "@ptolemy2002/immutability-utils";
import { RGXToken } from "./types";
import { isRGXToken } from "./typeGuards";

export function cloneRGXToken<T extends RGXToken>(token: T, depth: CloneDepth="max"): T {
    if (depth === 0) return token;
    if (isRGXToken(token, "no-op") || isRGXToken(token, "native")) return token;
    return extClone(token, depthDecrement(depth, 1));
}