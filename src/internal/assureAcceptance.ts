import { RGXClassToken } from "src/class";
import { RGXTokenCollection } from "src/collection";
import { RGXInsertionRejectedError, RGXInvalidTokenError } from "src/errors";
import { isRGXArrayToken, isRGXConvertibleToken, isRGXJSONClassToken } from "src/typeGuards";
import { rgxTokenFromJSON } from "src/json";
import { RGXInsertionContext, RGXToken } from "src/types";
import { withoutRGXInsertionChecks } from "./insertionContext";

function describeRGXContainer(token: RGXToken): string {
    if (RGXClassToken.check(token)) return token.constructor.name;
    if (RGXTokenCollection.check(token)) return "RGXTokenCollection";
    if (isRGXArrayToken(token, false)) return "array";
    return "convertible token";
}

// The path of indices from the top level of the pattern to the token, along with the containers along the way.
export function describeRGXInsertionLocation(context: RGXInsertionContext): string {
    const indices: number[] = [];
    const containers: string[] = [];

    for (let level: RGXInsertionContext | null = context; level !== null; level = level.parent) {
        indices.unshift(level.index);
        if (level.container !== null) containers.unshift(describeRGXContainer(level.container));
    }

    let result = `index ${indices.join(" > ")}`;
    if (containers.length > 0) result += ` (inside ${containers.join(" > ")})`;
    return result;
}

export function assureAcceptance(rawToken: RGXToken, context: RGXInsertionContext) {
    // JSON class tokens become class tokens, which may have insertion preferences.
    const token = isRGXJSONClassToken(rawToken, false) ? rgxTokenFromJSON(rawToken) : rawToken;
    if (!isRGXConvertibleToken(token, false) || !token.rgxAcceptInsertion) return;

    // Anything the hook resolves to inspect its surroundings isn't part of the pattern.
    const hook = token.rgxAcceptInsertion.bind(token);
    // The return value is checked here, since type guards don't call the hook.
    const messageOrAccepted: unknown = withoutRGXInsertionChecks(() => hook(context));
    if (typeof messageOrAccepted !== "string" && typeof messageOrAccepted !== "boolean") {
        throw new RGXInvalidTokenError("Invalid convertible token", { type: "custom", values: ["convertible token whose rgxAcceptInsertion method returns a string or boolean"] }, token);
    }

    if (messageOrAccepted === true) return;

    const extraMessage = `${describeRGXInsertionLocation(context)}, token type ${RGXClassToken.check(token) ? token.constructor.name : "unknown"}`;
    if (messageOrAccepted === false) throw new RGXInsertionRejectedError(null, extraMessage, context);
    throw new RGXInsertionRejectedError(messageOrAccepted, extraMessage, context);
}
