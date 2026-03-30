import { RGXToken } from "src/types";
import { RGXClassToken } from "./base";
import { RGXClassUnionToken } from "./union";
import { RGXTokenCollectionInput } from "src/collection";
import { resolveRGXToken } from "src/resolve";
import { assertValidIdentifier } from "src/typeGuards";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";
import { cloneRGXToken } from "src/clone";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";
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

        return new RegExp(source);
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
}

export const rgxExclusion = createConstructFunction(RGXExclusionToken);