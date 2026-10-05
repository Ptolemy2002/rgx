import { RGXJSONClassToken, RGXJSONToken, RGXJSONValue, RGXToken } from "src/types";
import { createRGXJSONClassToken, rgxJSONClassArgs, rgxTokenFromJSON, rgxTokenToJSON } from "src/json";
import { RGXClassToken } from "./base";
import { RGXClassUnionToken } from "./union";
import { RGXTokenCollectionInput } from "src/collection";
import { resolveRGXToken } from "src/resolve";
import { assertValidIdentifier, isRGXJSONToken } from "src/typeGuards";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";
import { cloneRGXToken } from "src/clone";
import { createAssertRGXClassGuardFunction, createRegex, createRGXClassGuardFunction } from "src/utils";
import { createConstructFunction } from "src/internal";

export class RGXExclusionToken extends RGXClassToken {
    _exclusionId: string;
    token: RGXToken;
    exclusions: RGXClassUnionToken;
    terminal: RGXToken = null;

    static check = createRGXClassGuardFunction(RGXExclusionToken);
    static assert = createAssertRGXClassGuardFunction(RGXExclusionToken);

    // exclusionId should be both a valid identifier and a unique group identifier across this branch of the entire pattern.
    // The issue is that we can't verify that second condition. We should just tell that to the user in documentation.
    get exclusionId() {
        return this._exclusionId;
    }

    set exclusionId(value: string) {
        assertValidIdentifier(value);
        this._exclusionId = value;
    }

    constructor(exclusionId: string, token: RGXToken, exclusions: RGXTokenCollectionInput=[], terminal: RGXToken = null) {
        super();
        this.exclusionId = exclusionId;
        this.token = token;
        this.exclusions = new RGXClassUnionToken(exclusions);
        this.terminal = terminal;
    }

    toRgx(): RGXToken {
        const resolvedToken = resolveRGXToken(this.token);
        const resolvedExclusions = this.exclusions.resolve();
        // null and undefined are no-ops and will resolve to empty strings.
        const resolvedTerminal = resolveRGXToken(this.terminal);

        // Get a match to the pattern in a lookahead, use a negative lookahead to
        // exclude the exclusion group from the match, then actually consume what we
        // got from the lookahead.

        // Note: the exclusions will prevent the pattern from matching if the matched text only
        // begins with an exclusion pattern, not just if it is the entire exclusion pattern. The solution to this is to provide
        // a terminal anchor, but that might not always be desirable or possible, so it's something to be aware of.
        const source = `(?=(?<${this.exclusionId}>${resolvedToken}${resolvedTerminal}))(?!${resolvedExclusions}${resolvedTerminal})\\k<${this.exclusionId}>`;
        // Because the terminal should be consuming no actual characters, it shuld be able to be repeated without issue, but we cannot actually validate
        // that the terminal is not consuming characters, so we will just document that the user not consume characters in the terminal.

        return createRegex(source);
    }

    clone(depth: CloneDepth = "max") {
        if (depth === 0) return this;
        return new RGXExclusionToken(
            this.exclusionId,
            cloneRGXToken(this.token, depthDecrement(depth, 1)),
            this.exclusions.clone(depthDecrement(depth, 1)),
            cloneRGXToken(this.terminal, depthDecrement(depth, 1))
        );
    }

    static validateJSONArgs(args: RGXJSONValue[]): boolean | string {
        if (args.length < 2 || args.length > 4) return "Expected between 2 and 4 arguments (exclusionId, token, exclusions, terminal).";

        const [exclusionId, token, exclusions, terminal] = args;
        if (typeof exclusionId !== "string") return "Argument 0 (exclusionId) must be a string.";
        if (!isRGXJSONToken(token)) return "Argument 1 (token) must be a JSON token.";
        if (exclusions !== undefined && !isRGXJSONToken(exclusions)) return "Argument 2 (exclusions) must be a JSON token, if present.";
        if (terminal !== undefined && !isRGXJSONToken(terminal)) return "Argument 3 (terminal) must be a JSON token, if present.";
        return true;
    }

    static fromJSON(json: RGXJSONClassToken): RGXExclusionToken {
        const [exclusionId, token, exclusions, terminal] = rgxJSONClassArgs(json, "RGXExclusionToken", RGXExclusionToken.validateJSONArgs) as [string, RGXJSONToken, RGXJSONToken?, RGXJSONToken?];
        return new RGXExclusionToken(
            exclusionId,
            rgxTokenFromJSON(token),
            exclusions === undefined ? [] : rgxTokenFromJSON(exclusions),
            terminal === undefined ? null : rgxTokenFromJSON(terminal)
        );
    }

    toJSON(): RGXJSONClassToken {
        return createRGXJSONClassToken("RGXExclusionToken", [
            this.exclusionId,
            rgxTokenToJSON(this.token),
            rgxTokenToJSON(this.exclusions.tokens.tokens),
            rgxTokenToJSON(this.terminal)
        ]);
    }
}

export const rgxExclusion = createConstructFunction(RGXExclusionToken);