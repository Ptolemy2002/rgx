import { CloneDepth, depthDecrement, extClone } from "@ptolemy2002/immutability-utils";
import {
    assertInRange, RGXInvalidWalkerError, RGXInvalidWalkerStepError, RGXPartValidationFailedError, RGXRegexNotMatchedAfterPositionError,
    RGXRegexNotMatchedAtPositionError
} from "src/errors";
import { RGXToken, ValidRegexFlags } from "src/types";
import { RGXPart, RGXCapture, RGXPartLossControl } from "./part";
import { resolveRGXToken } from "src/resolve";
import { assertRegexMatchesAfterPosition, assertRegexMatchesAtPosition, createRegex } from "src/utils";
import { RGXClassUnionToken, RGXGroupToken } from "src/class";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";
import { RGXCurrentTokenNotFoundError } from "src/errors/currentTokenNotFound";
import { assertValidRegexReferences, collectRGXReferences, hasRegexParenErrors, placeRGXToken, withRGXInsertionRoot } from "src/internal";

export type RGXWalkerOptions<R, S = unknown> = {
    startingSourcePosition?: number;
    reduced?: R;
    share?: S;
    infinite?: boolean;
    looping?: boolean;
    contiguous?: boolean;
};

export type RGXTryWalkOptions = {
    revertReduced?: boolean;
    revertShare?: boolean;
    revertCaptures?: boolean;
};

// A validation error from a branch of a union step, whether it was dropped so the other branches could be tried or
// thrown because no branch was left.
export type RGXWalkerBranchError = {
    error: RGXPartValidationFailedError;
    capture: RGXCapture; // The capture that failed validation
    tokenPosition: number; // The position of the step in the walker's tokens
};

export type RGXWalkerSnapshotKey =
    | "sourcePosition"
    | "tokenPosition"
    | "reduced"
    | "share"
    | "captures"
    | "namedCaptures";

export type RGXWalkerSnapshot<R, S> = Partial<{
    sourcePosition: number;
    tokenPosition: number;
    reduced: R;
    share: S;
    captures: RGXCapture[];
    namedCaptures: Record<string, RGXCapture[]>;
}>;

const branchGroupPrefix = "rgx_branch_";

export type RGXTokenOrPart<R, S = unknown, T = any> = RGXToken | RGXPart<R, S, T>;
// A step can be a union of tokens and parts, written as an array nested to any depth.
export type RGXWalkerStep<R, S = unknown, T = any> = RGXTokenOrPart<R, S, T> | RGXWalkerStep<R, S, T>[];
export type RGXWalkerStepDirective = "stop" | "skip" | "silent";

// One alternative of a step: the part that handles its capture (or null for a plain token), and the token it is
// matched with. index is its position among the step's alternatives, which is the capture's branch number.
type RGXWalkerBranch<R, S> = {
    index: number;
    owner: RGXPart<R, S, unknown> | null;
    token: RGXToken;
};

// The alternatives of a union, with every union that is only reachable through other unions flattened, in order.
// Anything that isn't a union is a single alternative.
function unionAlternatives<R, S>(step: RGXWalkerStep<R, S>): RGXTokenOrPart<R, S>[] {
    // An empty union is kept as an alternative that matches the empty string.
    if (Array.isArray(step) && step.length > 0) return step.flatMap(alternative => unionAlternatives(alternative));
    if (RGXClassUnionToken.check(step)) return step.tokens.flatMap(alternative => unionAlternatives(alternative));
    return [step as RGXTokenOrPart<R, S>];
}

function containsPart<R, S>(step: RGXWalkerStep<R, S>, predicate: (part: RGXPart<R, S, unknown>) => boolean = () => true): boolean {
    if (Array.isArray(step)) return step.some(alternative => containsPart(alternative, predicate));
    return RGXPart.check(step) && predicate(step);
}

// Replaces each part in the step with a token: the one it would be matched with now, or a no-op token for a dynamic
// part when resolveDynamic isn't given. Steps without parts are returned as-is.
function plainStepToken<R, S>(step: RGXWalkerStep<R, S>, resolveDynamic?: (part: RGXPart<R, S, unknown>) => RGXToken): RGXToken {
    if (!containsPart(step)) return step as RGXToken;
    if (RGXPart.check(step)) return step.isDynamic() ? resolveDynamic?.(step) ?? null : step.token as RGXToken;
    return (step as RGXWalkerStep<R, S>[]).map(alternative => plainStepToken(alternative, resolveDynamic));
}

// Wraps each branch in a group named after its index, so the match shows which one matched. A single branch is
// matched as-is.
function branchesToken<R, S>(branches: readonly RGXWalkerBranch<R, S>[]): RGXToken {
    if (branches.length === 1) return branches[0]!.token;
    return new RGXClassUnionToken(branches.map(branch => new RGXGroupToken({ name: `${branchGroupPrefix}${branch.index}` }, [branch.token])));
}

// The groups of a match, without the walker's branch groups, or null if there are none.
function userGroups(groups: Record<string, string> | undefined): Record<string, string> | null {
    if (!groups) return null;
    const entries = Object.entries(groups).filter(([name]) => !name.startsWith(branchGroupPrefix));
    return entries.length > 0 ? Object.fromEntries(entries) : null;
}

// Checks the source a step resolves to, before branch groups are added. index is the step's position in the walker's
// tokens, if known.
function assertValidStepSource(source: string, references: readonly (string | number)[], index: number | null, isUnion: boolean) {
    // Interpolations may leave parentheses unbalanced for a later token to close, but a step is matched on its own.
    if (hasRegexParenErrors(source)) {
        throw new RGXInvalidWalkerStepError("Walker steps are matched on their own, so each one must have balanced parentheses", index, source);
    }

    // Branch groups would shift the group numbers of a union.
    assertValidRegexReferences(source, references, { reservedGroupPrefix: branchGroupPrefix, rejectNumeric: isUnion });
}

// The walker matches each step on its own, without flags, so insertions are checked by resolving the step at its
// position as the top level of a pattern with no flags. Returns the resolved source along with the backreferences
// recorded while resolving it.
function resolveCheckedStep(siblings: readonly RGXToken[], index: number): [string, (string | number)[]] {
    return collectRGXReferences(() => withRGXInsertionRoot('' as ValidRegexFlags, () => {
        return placeRGXToken(siblings, index, () => resolveRGXToken(siblings[index]));
    }));
}

// Checks every step, the same way the walker does before matching each one. Dynamic parts produce their token when
// they are captured, so they are checked then instead, and other steps see them as no-op tokens.
export function validateRGXWalkerSteps<R, S>(tokens: readonly RGXWalkerStep<R, S>[]) {
    const plainTokens = tokens.map(step => plainStepToken(step));
    tokens.forEach((step, i) => {
        if (RGXPart.check(step) && step.isDynamic()) return;
        const [source, references] = resolveCheckedStep(plainTokens, i);
        assertValidStepSource(source, references, i, unionAlternatives(plainTokens[i]).length > 1);
    });
}

function isMatchError(e: unknown): e is RGXRegexNotMatchedAtPositionError | RGXRegexNotMatchedAfterPositionError | RGXPartValidationFailedError {
    return (
        e instanceof RGXRegexNotMatchedAtPositionError ||
        e instanceof RGXRegexNotMatchedAfterPositionError ||
        e instanceof RGXPartValidationFailedError
    );
}

export class RGXWalker<R, S = unknown> {
    readonly source: string;
    _sourcePosition: number;

    readonly tokens: RGXWalkerStep<R, S>[];
    _tokenPosition: number;

    reduced: R;
    share: S;

    captures: RGXCapture[] = [];
    namedCaptures: Record<string, RGXCapture[]> = {};
    // The validation errors of the union branches that failed in the latest step.
    branchErrors: RGXWalkerBranchError[] = [];

    infinite: boolean;
    looping: boolean;
    contiguous: boolean;

    private _stopped: boolean = false;
    // Only relevant in infinite mode, tracking whether we've reached the end yet.
    private _didReachEnd: boolean = false;
    private _snapshots: Map<string, RGXWalkerSnapshot<R, S>> = new Map();

    static check = createRGXClassGuardFunction(RGXWalker);
    static assert = createAssertRGXClassGuardFunction(RGXWalker,
        (value, constructor) => new RGXInvalidWalkerError("Invalid Walker", value, constructor.name)
    );

    get sourcePosition() {
        return this._sourcePosition;
    }

    set sourcePosition(value: number) {
        assertInRange(value, { min: 0, max: this.source.length }, "sourcePosition is outside the bounds of the source string");
        this._sourcePosition = Math.floor(value);
    }

    get tokenPosition() {
        return this._tokenPosition;
    }

    set tokenPosition(value: number) {
        assertInRange(value, { min: 0, max: this.tokens.length }, "tokenPosition is outside the bounds of the token collection");
        this._tokenPosition = Math.floor(value);
    }

    get stopped() {
        return this._stopped;
    }

    constructor(source: string, tokens: RGXWalkerStep<R, S>[], options: RGXWalkerOptions<R, S> = {}) {
        this.source = source;
        this.sourcePosition = options.startingSourcePosition ?? 0;
        this.tokens = tokens;
        this.tokenPosition = 0;

        this.reduced = options.reduced ?? null as unknown as R;
        this.share = options.share ?? null as unknown as S;

        this.infinite = options.infinite ?? false;
        this.looping = options.looping ?? false;
        this.contiguous = options.contiguous ?? true;
    }

    stop() {
        this._stopped = true;
        return this;
    }

    atTokenEnd() {
        return this.tokenPosition >= this.tokens.length;
    }

    atLastToken() {
        return this.tokenPosition === this.tokens.length - 1;
    }

    hasNextToken(predicate: (token: RGXWalkerStep<R, S, unknown>) => boolean = () => true) {
        return !this.atTokenEnd() && predicate(this.currentToken());
    }

    atSourceEnd() {
        return this.sourcePosition >= this.source.length;
    }

    hasNextSource(predicate: (rest: string) => boolean = () => true) {
        return !this.atSourceEnd() && predicate(this.remainingSource()!);
    }

    // The latest capture, or the latest one made by the part with the given id.
    lastCapture(id?: string): RGXCapture | null {
        const captures = id === undefined ? this.captures : this.namedCaptures[id] ?? [];
        return captures[captures.length - 1] ?? null;
    }

    // The text the latest capture that matched a group with the given name captured in it, or null if none did.
    lastGroup(name: string): string | null {
        for (let i = this.captures.length - 1; i >= 0; i--) {
            const value = this.captures[i]!.groups?.[name];
            if (value !== undefined) return value;
        }
        return null;
    }

    currentToken() {
        // Because an RGXToken might be null or undefined, this error is used
        // to indicate there is no current token when one is expected.
        // Previously, we just returned null.
        if (this.atTokenEnd()) throw new RGXCurrentTokenNotFoundError("Token position is at the end of the token collection, no current token exists");
        return this.tokens[this.tokenPosition];
    }

    remainingSource() {
        if (this.atSourceEnd()) return null;
        return this.source.slice(this.sourcePosition);
    }

    capture(token: RGXWalkerStep<R, S>, includeMatch: true): RegExpExecArray;
    capture(token: RGXWalkerStep<R, S>, includeMatch?: false): string;
    capture(token: RGXWalkerStep<R, S>, includeMatch = false): string | RegExpExecArray {
        const plain = this.resolveStepToken(token);
        // Without branch groups, group numbers don't shift.
        const source = this.checkStep(token, plain, false);
        const match = this.matchRegex(createRegex(source));
        return includeMatch ? match : match[0];
    }

    // The token to match the step with now, with each part replaced by the token it produces.
    private resolveStepToken(step: RGXWalkerStep<R, S>): RGXToken {
        return plainStepToken(step, part => part.resolveToken(this));
    }

    // Resolves the token a step is matched with and checks it, returning the resolved source. When the step has a
    // dynamic part, its token is only known now, so its insertions are checked now too, at the step's position among
    // the walker's tokens if it is the current one.
    private checkStep(step: RGXWalkerStep<R, S>, plain: RGXToken, isUnion: boolean): string {
        let source: string;
        let references: (string | number)[];

        if (containsPart(step, part => part.isDynamic())) {
            const isCurrent = !this.atTokenEnd() && this.currentToken() === step;
            const siblings = isCurrent ? this.tokens.map((t, i) => i === this.tokenPosition ? plain : plainStepToken(t)) : [plain];
            [source, references] = resolveCheckedStep(siblings, isCurrent ? this.tokenPosition : 0);
        } else {
            [source, references] = collectRGXReferences(() => resolveRGXToken(plain));
        }

        assertValidStepSource(source, references, null, isUnion);
        return source;
    }

    // Matches the regex at the current position (or after it, if not contiguous), and moves past the match.
    private matchRegex(regex: RegExp): RegExpExecArray {
        const args = [regex, this.source, Math.min(this.sourcePosition, this.source.length - 1), 10, true] as const;
        let match: RegExpExecArray;
        let endPosition: number;

        if (this.contiguous) {
            match = assertRegexMatchesAtPosition(...args);
            endPosition = this.sourcePosition + match[0].length;
        } else {
            const [startPosition, _match] = assertRegexMatchesAfterPosition(...args);
            match = _match;
            endPosition = startPosition + match[0].length;
        }

        this.sourcePosition = endPosition;
        return match;
    }

    private advanceToken() {
        if (this.atLastToken()) this._didReachEnd = true;
        
        if (!this.infinite || !this.atLastToken()) {
            this.tokenPosition++;
            if (this.looping && this.atTokenEnd()) {
                this.tokenPosition = 0;
            }
        }
    }

    private registerCapture(captureResult: RGXCapture, owner: RGXPart<R, S, unknown> | null) {
        this.captures.push(captureResult);
        if (owner !== null && owner.hasId()) {
            if (!(owner.id in this.namedCaptures)) this.namedCaptures[owner.id] = [];
            this.namedCaptures[owner.id]!.push(captureResult);
        }
    }

    private unregisterLastCapture(owner: RGXPart<R, S, unknown>) {
        this.captures.pop();
        if (owner.hasId()) {
            this.namedCaptures[owner.id]!.pop();
        }
    }

    private handleBeforeCapture(token: RGXPart<R, S, unknown>): RGXWalkerStepDirective | null {
        const control = token.beforeCapture?.({ part: token, walker: this });
        // If this happens, beforeCapture itself stopped the walker, so we just need to respect that.
        if (this.stopped) return "stop";
        if (control === "stop" || control === "stop-silent") return "stop";
        if (control === "skip") return "skip";
        if (control === "silent") return "silent";
        return null;
    }

    // Calls afterFailure on each part, in order. Every part's hook runs, and the first directive other than void
    // decides what happens. Returns null if the error should be rethrown.
    private handleAfterFailure(
        parts: readonly RGXPart<R, S, unknown>[],
        e: RGXRegexNotMatchedAtPositionError | RGXRegexNotMatchedAfterPositionError
    ): Exclude<RGXWalkerStepDirective, "silent"> | null {
        let result: Exclude<RGXWalkerStepDirective, "silent"> | null = null;
        for (const part of parts) {
            const control = part.afterFailure?.(e, { part, walker: this });
            // If this happens, afterFailure itself stopped the walker, so we just need to respect that.
            if (this.stopped) return "stop";
            // Handling silent is pointless here since it won't add a capture in either case, so we don't check for it.
            if (result === null && (control === "stop" || control === "stop-silent")) result = "stop";
            if (result === null && control === "skip") result = "skip";
        }
        return result;
    }

    // Returns a directive on handled validation failure, "retry" if another branch should be tried, and null on
    // success. Unhandled errors are rethrown. In a union of parts, unhandled errors are recorded in branchErrors.
    private validateCapture(
        token: RGXPart<R, S, unknown>,
        captureResult: RGXCapture<unknown>,
        isUnion: boolean,
        canRetry: boolean
    ): Exclude<RGXWalkerStepDirective, "silent"> | "retry" | null {
        try {
            token.validate(captureResult, { part: token, walker: this });
            return null;
        } catch (e) {
            this.restore("step"); // Reset source position on validation failure
            if (e instanceof RGXPartValidationFailedError) {
                const control = token.afterValidationFailure?.(e, { part: token, walker: this });
                // If this happens, afterValidationFailure itself stopped the walker, so we just need to respect that.
                if (this.stopped) return "stop";
                if (control === "stop" || control === "stop-silent") return "stop";
                if (control === "skip") return "skip";
                // Handling silent is pointless here since it won't add a capture in either case, so we don't check for it.
                if (isUnion) this.branchErrors.push({ error: e, capture: captureResult, tokenPosition: this.tokenPosition });
                if (canRetry) return "retry";
            }
            throw e;
        }
    }

    // Calls afterLoss on each part that wasn't picked, in branch order. Every part's hook runs, and the first directive
    // other than void decides what happens.
    private handleAfterLoss(
        losers: readonly RGXWalkerBranch<R, S>[],
        winner: RGXWalkerBranch<R, S>,
        winningStep: RGXTokenOrPart<R, S>,
        captureResult: RGXCapture<unknown>
    ): RGXPartLossControl {
        let result: RGXPartLossControl = undefined;
        for (const loser of losers) {
            const part = loser.owner!;
            const reason = loser.index < winner.index ? "no-match" : "not-reached";
            const control = part.afterLoss?.({ reason, winner: winningStep, capture: captureResult }, { part, walker: this });
            // If this happens, afterLoss itself stopped the walker, so we just need to respect that.
            if (this.stopped) return result ?? "stop";
            if (result === undefined && (control === "stop" || control === "stop-silent")) result = control;
        }
        return result;
    }

    private handleAfterCapture(
        token: RGXPart<R, S, unknown>,
        captureResult: RGXCapture<unknown>,
        silent: boolean
    ): Exclude<RGXWalkerStepDirective, "silent"> | null {
        const control = token.afterCapture?.(captureResult, { part: token, walker: this });

        if (!silent && (control === "skip" || control === "silent" || control === "stop-silent")) {
            this.unregisterLastCapture(token);
        }

        // If this happens, afterCapture itself stopped the walker, so we just need to respect that.
        if (this.stopped) return "stop";

        if (control === "skip") {
            this.restore("step");
            return "skip";
        }
        if (control === "stop" || control === "stop-silent") return "stop";
        return null;
    }

    // The step's branches, after calling beforeCapture on its parts. Returns a directive instead if a part stopped
    // the walker or every alternative was skipped.
    private prepareBranches(step: RGXWalkerStep<R, S>):
        | { branches: RGXWalkerBranch<R, S>[], silentParts: Set<RGXPart<R, S, unknown>>, alternatives: RGXTokenOrPart<R, S>[] }
        | Exclude<RGXWalkerStepDirective, "silent"> {
        // A single part is one alternative, so it handles every branch of its own token.
        const alternatives = RGXPart.check(step) ? [step] : unionAlternatives(step);
        const silentParts = new Set<RGXPart<R, S, unknown>>();
        const skipped = new Set<number>();

        for (const [i, alternative] of alternatives.entries()) {
            if (!RGXPart.check(alternative)) continue;
            const dir = this.handleBeforeCapture(alternative);
            if (dir === "stop") return "stop";
            if (dir === "skip") skipped.add(i);
            if (dir === "silent") silentParts.add(alternative);
        }

        if (skipped.size === alternatives.length) return "skip";

        let branches: RGXWalkerBranch<R, S>[];
        if (RGXPart.check(step)) {
            branches = unionAlternatives(step.resolveToken(this)).map((token, index) => ({ index, owner: step, token: token as RGXToken }));
        } else {
            branches = alternatives.flatMap((alternative, index): RGXWalkerBranch<R, S>[] => {
                if (skipped.has(index)) return [];
                if (RGXPart.check(alternative)) return [{ index, owner: alternative, token: alternative.resolveToken(this) }];
                return [{ index, owner: null, token: alternative as RGXToken }];
            });
        }

        return { branches, silentParts, alternatives };
    }

    step(): RGXCapture | null {
        // A new array, so one taken from an earlier step keeps that step's errors.
        this.branchErrors = [];
        if (!this.infinite && !this.looping && this.atTokenEnd()) {
            this._stopped = true;
            return null;
        }
        // If we're infinite, we need to manually stop when all is exhausted.
        if ((this.infinite || this.looping) && this.atSourceEnd()) {
            this._stopped = true;
            return null;
        }

        const step = this.currentToken();
        const prepared = this.prepareBranches(step);
        if (prepared === "stop") { this._stopped = true; return null; }
        if (prepared === "skip") { this.advanceToken(); return null; }

        const { silentParts, alternatives } = prepared;
        let branches = prepared.branches;
        // In a union of parts, a branch whose capture fails validation is dropped, so the others get a chance.
        const canRetry = !RGXPart.check(step);
        const isUnion = (RGXPart.check(step) ? branches.length : alternatives.length) > 1;
        const checkedSource = this.checkStep(step, branches.length === 1 ? branches[0]!.token : branches.map(branch => branch.token), isUnion);
        // A single branch is matched as the token that was just checked, so its source is reused instead of resolving
        // it again. Branches are only dropped from unions, which add branch groups, so this stays valid while retrying.
        const singleSource = branches.length === 1 ? checkedSource : null;

        // Snapshot the source position so validateCapture and handleAfterCapture
        // can restore it on skip/failure.
        this.snapshot("step", "sourcePosition");

        let winner: RGXWalkerBranch<R, S>;
        let captureResult: RGXCapture<unknown>;
        while (true) {
            let match: RegExpExecArray;
            try {
                match = this.matchRegex(createRegex(singleSource ?? resolveRGXToken(branchesToken(branches))));
            } catch (e) {
                if (e instanceof RGXRegexNotMatchedAtPositionError || e instanceof RGXRegexNotMatchedAfterPositionError) {
                    const owners = [...new Set(branches.flatMap(branch => branch.owner === null ? [] : [branch.owner]))];
                    const dir = this.handleAfterFailure(owners, e);
                    if (dir === "stop") { this._stopped = true; return null; }
                    if (dir === "skip") { this.advanceToken(); return null; }
                }

                if (e instanceof RGXRegexNotMatchedAfterPositionError) {
                    // If we're in infinite mode, we've reached the end before, and we're at the end now,
                    // this is recoverable. Just stop the walker instead of throwing an error.
                    if (this.infinite && this._didReachEnd && this.atLastToken()) {
                        this._stopped = true;
                        return null;
                    }
                }

                throw e;
            }

            winner = branches.length === 1 ? branches[0]! : branches.find(branch => match.groups?.[`${branchGroupPrefix}${branch.index}`] !== undefined)!;
            const owner = winner.owner;

            // The reason we no longer track start as the position before attempting capture
            // is the possibility of non-contiguous matches. In that case, there may be a gap between
            // the previous position and the actual start of the capture.
            const start = this.sourcePosition - match[0].length;
            const raw = owner ? owner.rawTransform(match[0]) : match[0];
            const end = this.sourcePosition;
            const value = owner ? owner.transform(raw) : raw;
            captureResult = {
                raw, value, start, end,
                branch: winner.index,
                ownerId: owner?.hasId() ? owner.id : null,
                groups: userGroups(match.groups)
            };

            if (owner === null) break;
            const dir = this.validateCapture(owner, captureResult, canRetry, canRetry && branches.length > 1);
            if (dir === "stop") { this._stopped = true; return null; }
            if (dir === "skip") { this.advanceToken(); return null; }
            if (dir === null) break;
            branches = branches.filter(branch => branch !== winner);
        }

        const owner = winner.owner;
        const silent = owner !== null && silentParts.has(owner);

        // The parts in a union that weren't picked are told so before the winner's afterCapture.
        const losers = canRetry ? branches.filter(branch => branch !== winner && branch.owner !== null) : [];
        const lossControl = losers.length > 0 ? this.handleAfterLoss(losers, winner, alternatives[winner.index]!, captureResult) : undefined;
        if (lossControl !== undefined) {
            if (!silent && lossControl === "stop") this.registerCapture(captureResult, owner);
            this.advanceToken();
            this._stopped = true;
            return null;
        }

        if (!silent) this.registerCapture(captureResult, owner);

        if (owner !== null) {
            const dir = this.handleAfterCapture(owner, captureResult, silent);
            if (dir === "stop") { this.advanceToken(); this._stopped = true; return null; }
            if (dir === "skip") { this.advanceToken(); return null; }
        }

        this.advanceToken();
        return captureResult;
    }

    private *_stepToTokenIter(predicate: (token: RGXWalkerStep<R, S, unknown>) => boolean): Generator<void> {
        while (this.hasNextToken()) {
            this._stopped = false;
            if (predicate(this.currentToken())) break;
            this.step();
            if (this._stopped) break;
            yield;
        }
    }

    stepToToken(predicate: (token: RGXWalkerStep<R, S>) => boolean = () => true) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const _ of this._stepToTokenIter(predicate)) { /* sync — no yield needed */ }
        return this;
    }

    async stepToTokenAsync(
        predicate: (token: RGXWalkerStep<R, S, unknown>) => boolean = () => true,
        yieldFn: () => Promise<void> = () => new Promise(resolve => setImmediate(resolve))
    ): Promise<this> {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const _ of this._stepToTokenIter(predicate)) await yieldFn();

        return this;
    }

    // If currently at a Part, steps past it (so repeated stepToPart calls advance
    // rather than getting stuck). Returns true when the walker stopped mid-step.
    private _stepPastCurrentPartIfNeeded(): boolean {
        if (this.hasNextToken() && this.currentToken() instanceof RGXPart) {
            this._stopped = false;
            this.step();
            if (this._stopped) return true;
        }
        return false;
    }

    stepToPart(predicate: (part: RGXPart<R, S, unknown>) => boolean = () => true) {
        if (this._stepPastCurrentPartIfNeeded()) return this;
        this.stepToToken(token => token instanceof RGXPart && predicate(token));
        return this;
    }

    async stepToPartAsync(
        predicate: (part: RGXPart<R, S, unknown>) => boolean = () => true,
        yieldFn: () => Promise<void> = () => new Promise(resolve => setImmediate(resolve))
    ): Promise<this> {
        if (this._stepPastCurrentPartIfNeeded()) return this;
        await this.stepToTokenAsync(token => token instanceof RGXPart && predicate(token), yieldFn);
        return this;
    }

    walk() {
        this.stepToToken(() => false);
        return this.reduced;
    }

    async walkAsync(
        yieldFn?: () => Promise<void>
    ): Promise<R> {
        await this.stepToTokenAsync(() => false, yieldFn);
        return this.reduced;
    }

    snapshot(name: string, ...keys: Array<RGXWalkerSnapshotKey | false>) {
        const filteredKeys = keys.filter((k): k is RGXWalkerSnapshotKey => k !== false);
        const snap: RGXWalkerSnapshot<R, S> = {};
        for (const key of filteredKeys) {
            if (key === "sourcePosition" || key === "tokenPosition") {
                snap[key] = this[key];
            } else {
                (snap as Record<string, unknown>)[key] = extClone(this[key], "max");
            }
        }
        this._snapshots.set(name, snap);
        return this;
    }

    restore(name: string) {
        const snap = this._snapshots.get(name);
        if (!snap) return this;
        if ("sourcePosition" in snap) this.sourcePosition = snap.sourcePosition!;
        if ("tokenPosition" in snap) this.tokenPosition = snap.tokenPosition!;
        // Clone again so later mutations don't leak into the stored snapshot.
        if ("reduced" in snap) this.reduced = extClone(snap.reduced!, "max");
        if ("share" in snap) this.share = extClone(snap.share!, "max");
        if ("captures" in snap) this.captures = extClone(snap.captures!, "max");
        if ("namedCaptures" in snap) this.namedCaptures = extClone(snap.namedCaptures!, "max");
        return this;
    }

    private _walkerSnapshot(name: string, {
        revertReduced,
        revertShare,
        revertCaptures
    }: Required<RGXTryWalkOptions>): RGXWalkerSnapshot<R, S> {
        return this.snapshot(name,
            "sourcePosition",
            "tokenPosition",
            revertReduced && "reduced",
            revertShare && "share",
            revertCaptures && "captures",
            revertCaptures && "namedCaptures"
        );
    }

    tryWalk({
        revertReduced = false,
        revertShare = false,
        revertCaptures = false
    }: RGXTryWalkOptions = {}): boolean {
        this._walkerSnapshot("tryWalk", { revertReduced, revertShare, revertCaptures });

        try {
            this.walk();
            return true;
        } catch (e) {
            this.restore("tryWalk");
            if (isMatchError(e)) return false;
            throw e;
        }
    }

    async tryWalkAsync(
        { revertReduced = false, revertShare = false, revertCaptures = false }: RGXTryWalkOptions = {},
        yieldFn?: () => Promise<void>
    ): Promise<boolean> {
        this._walkerSnapshot("tryWalk", { revertReduced, revertShare, revertCaptures });

        try {
            await this.walkAsync(yieldFn);
            return true;
        } catch (e) {
            this.restore("tryWalk");
            if (isMatchError(e)) return false;
            throw e;
        }
    }

    // Clone method
    clone(depth: CloneDepth="max") {
        if (depth === 0) return this;
        const clone = new RGXWalker(
            this.source, extClone(this.tokens, depthDecrement(depth, 1)), {
                startingSourcePosition: this.sourcePosition,
                reduced: extClone(this.reduced, depthDecrement(depth, 1)),
                share: extClone(this.share, depthDecrement(depth, 1)),
                infinite: this.infinite,
                looping: this.looping,
                contiguous: this.contiguous
            }
        );

        clone._tokenPosition = this.tokenPosition;
        clone.captures = extClone(this.captures, depthDecrement(depth, 1));
        clone.namedCaptures = extClone(this.namedCaptures, depthDecrement(depth, 1));
        clone.branchErrors = extClone(this.branchErrors, depthDecrement(depth, 1));
        clone._stopped = this._stopped;

        return clone;
    }
}

export function rgxWalker<R, S = unknown>(...args: ConstructorParameters<typeof RGXWalker<R, S>>) {
    return new RGXWalker<R, S>(...args);
};