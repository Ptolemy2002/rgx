import { CloneDepth, depthDecrement, extClone } from "@ptolemy2002/immutability-utils";
import { RGXTokenCollection, RGXTokenCollectionInput } from "src/collection";
import {
    assertInRange, RGXInvalidWalkerError, RGXInvalidWalkerStepError, RGXPartValidationFailedError, RGXRegexNotMatchedAfterPositionError,
    RGXRegexNotMatchedAtPositionError
} from "src/errors";
import { RGXToken, ValidRegexFlags } from "src/types";
import { RGXPart, RGXCapture } from "./part";
import { resolveRGXToken } from "src/resolve";
import { assertRegexMatchesAfterPosition, assertRegexMatchesAtPosition, createRegex } from "src/utils";
import { isRGXArrayToken } from "src/typeGuards";
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

function createBranchGroups(tokens: RGXTokenCollectionInput): RGXToken {
    if (
        (tokens instanceof RGXTokenCollection && tokens.mode === "union") ||
        RGXClassUnionToken.check(tokens)
    ) return createBranchGroups(tokens.tokens);

    if (isRGXArrayToken(tokens)) {
        const newTokens = tokens.map((token, i) => {
            return new RGXGroupToken({name: `${branchGroupPrefix}${i}`}, [token]);
        });

        return new RGXClassUnionToken(newTokens);
    } else {
        return tokens;
    }
}

const branchGroupPrefix = "rgx_branch_";

function isDynamicPart<R, S>(token: RGXTokenOrPart<R, S>): boolean {
    return RGXPart.check(token) && token.isDynamic();
}

// The token a step is matched with, as far as it is known before walking. Dynamic parts only produce their token when
// they are captured, so they are a no-op token here.
function staticStepToken<R, S>(token: RGXTokenOrPart<R, S>): RGXToken {
    if (!RGXPart.check(token)) return token as RGXToken;
    return token.isDynamic() ? null : token.token as RGXToken;
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

// Checks every step that isn't a dynamic part, the same way the walker does before matching each one.
export function validateRGXWalkerSteps<R, S>(tokens: readonly RGXTokenOrPart<R, S>[]) {
    const plainTokens = tokens.map(staticStepToken);
    tokens.forEach((token, i) => {
        // Dynamic parts are checked when they are captured instead.
        if (isDynamicPart(token)) return;
        const [source, references] = resolveCheckedStep(plainTokens, i);
        assertValidStepSource(source, references, i, createBranchGroups(plainTokens[i]) !== plainTokens[i]);
    });
}

function isMatchError(e: unknown): e is RGXRegexNotMatchedAtPositionError | RGXRegexNotMatchedAfterPositionError | RGXPartValidationFailedError {
    return (
        e instanceof RGXRegexNotMatchedAtPositionError ||
        e instanceof RGXRegexNotMatchedAfterPositionError ||
        e instanceof RGXPartValidationFailedError
    );
}

export type RGXTokenOrPart<R, S = unknown, T = any> = RGXToken | RGXPart<R, S, T>;
export type RGXWalkerStepDirective = "stop" | "skip" | "silent";

export class RGXWalker<R, S = unknown> {
    readonly source: string;
    _sourcePosition: number;

    readonly tokens: RGXTokenOrPart<R, S>[];
    _tokenPosition: number;

    reduced: R;
    share: S;

    captures: RGXCapture[] = [];
    namedCaptures: Record<string, RGXCapture[]> = {};

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

    constructor(source: string, tokens: RGXTokenOrPart<R, S>[], options: RGXWalkerOptions<R, S> = {}) {
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

    hasNextToken(predicate: (token: RGXTokenOrPart<R, S, unknown>) => boolean = () => true) {
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

    capture(token: RGXTokenOrPart<R, S>, includeMatch: true): RegExpExecArray;
    capture(token: RGXTokenOrPart<R, S>, includeMatch?: false): string;
    capture(token: RGXTokenOrPart<R, S>, includeMatch = false): string | RegExpExecArray {
        const match = this.matchRegex(createRegex(this.resolveStep(token, false)));
        return includeMatch ? match : match[0];
    }

    // Resolves a step and checks it, returning the source to match it with. A dynamic part produces its token here,
    // so its insertions are checked here too, at its position among the walker's tokens if it is the current one.
    private resolveStep(token: RGXTokenOrPart<R, S>, branch: boolean): string {
        let plain: RGXToken;
        let source: string;
        let references: (string | number)[];

        if (RGXPart.check(token) && token.isDynamic()) {
            plain = token.resolveToken(this);
            const isCurrent = !this.atTokenEnd() && this.currentToken() === token;
            const siblings = isCurrent ? this.tokens.map((t, i) => i === this.tokenPosition ? plain : staticStepToken(t)) : [plain];
            [source, references] = resolveCheckedStep(siblings, isCurrent ? this.tokenPosition : 0);
        } else {
            plain = staticStepToken(token);
            [source, references] = collectRGXReferences(() => resolveRGXToken(plain));
        }

        const branched = branch ? createBranchGroups(plain) : plain;
        assertValidStepSource(source, references, null, branched !== plain);
        return branched === plain ? source : resolveRGXToken(branched);
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

    private determineBranch(capture: RegExpExecArray): number {
        for (let i = 0; i < capture.length; i++) {
            if (capture.groups?.[`${branchGroupPrefix}${i}`] !== undefined) return i;
        }
        return 0;
    }

    private registerCapture(captureResult: RGXCapture, token: RGXTokenOrPart<R, S>) {
        this.captures.push(captureResult);
        if (token instanceof RGXPart && token.hasId()) {
            if (!(token.id in this.namedCaptures)) this.namedCaptures[token.id] = [];
            this.namedCaptures[token.id]!.push(captureResult);
        }
    }

    private unregisterLastCapture(token: RGXTokenOrPart<R, S>) {
        this.captures.pop();
        if (token instanceof RGXPart && token.hasId()) {
            this.namedCaptures[token.id]!.pop();
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

    // Returns the capture on success, or a directive on handled failure. Unhandled errors are rethrown.
    private attemptCapture(
        token: RGXTokenOrPart<R, S>,
        part: RGXPart<R, S, unknown> | null
    ): RegExpExecArray | Exclude<RGXWalkerStepDirective, "silent"> {
        // Unions are wrapped in branch groups, so the capture can record which branch matched.
        const regex = createRegex(this.resolveStep(token, true));
        try {
            return this.matchRegex(regex);
        } catch (e) {
            if (part !== null && (e instanceof RGXRegexNotMatchedAtPositionError || e instanceof RGXRegexNotMatchedAfterPositionError)) {
                const control = part.afterFailure?.(e, { part, walker: this });
                // If this happens, afterFailure itself stopped the walker, so we just need to respect that.
                if (this.stopped) return "stop";
                if (control === "stop" || control === "stop-silent") return "stop";
                if (control === "skip") return "skip";
                // Handling silent is pointless here since it won't add a capture in either case, so we don't check for it.
            }
            throw e;
        }
    }

    // Returns a directive on handled validation failure, null on success. Unhandled errors are rethrown.
    private validateCapture(
        token: RGXPart<R, S, unknown>,
        captureResult: RGXCapture<unknown>
    ): Exclude<RGXWalkerStepDirective, "silent"> | null {
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
            }
            throw e;
        }
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

    step(): RGXCapture | null {
        if (!this.infinite && !this.looping && this.atTokenEnd()) {
            this._stopped = true;
            return null;
        }
        // If we're infinite, we need to manually stop when all is exhausted.
        if ((this.infinite || this.looping) && this.atSourceEnd()) {
            this._stopped = true;
            return null;
        }

        const token = this.currentToken();
        const isPart = token instanceof RGXPart;
        let silent = false;

        if (isPart) {
            const dir = this.handleBeforeCapture(token);
            if (dir === "stop") { this._stopped = true; return null; }
            if (dir === "skip") { this.advanceToken(); return null; }
            silent = dir === "silent";
        }

        // Snapshot the source position so validateCapture and handleAfterCapture
        // can restore it on skip/failure.
        this.snapshot("step", "sourcePosition");

        let captureAttempt: ReturnType<typeof this.attemptCapture>;
        try {
            captureAttempt = this.attemptCapture(token, isPart ? token : null);
            if (captureAttempt === "stop") { this._stopped = true; return null; }
            if (captureAttempt === "skip") { this.advanceToken(); return null; }
        } catch (e) {
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

        // The reason we no longer track start as the position before attempting capture
        // is the possibility of non-contiguous matches. In that case, there may be a gap between
        // the previous position and the actual start of the capture.
        const start = this.sourcePosition - captureAttempt[0].length;
        const raw = isPart ? token.rawTransform(captureAttempt[0]) : captureAttempt[0];
        const end = this.sourcePosition;
        const value = isPart ? token.transform(raw) : raw;
        const captureResult: RGXCapture<typeof value> = {
            raw, value, start, end,
            branch: this.determineBranch(captureAttempt),
            ownerId: isPart && token.hasId() ? token.id : null,
            groups: captureAttempt.groups ?? null
        };

        if (isPart) {
            const dir = this.validateCapture(token, captureResult);
            if (dir === "stop") { this._stopped = true; return null; }
            if (dir === "skip") { this.advanceToken(); return null; }
        }

        if (!silent) this.registerCapture(captureResult, token);

        if (isPart) {
            const dir = this.handleAfterCapture(token, captureResult, silent);
            if (dir === "stop") { this.advanceToken(); this._stopped = true; return null; }
            if (dir === "skip") { this.advanceToken(); return null; }
        }

        this.advanceToken();
        return captureResult;
    }

    private *_stepToTokenIter(predicate: (token: RGXTokenOrPart<R, S, unknown>) => boolean): Generator<void> {
        while (this.hasNextToken()) {
            this._stopped = false;
            if (predicate(this.currentToken())) break;
            this.step();
            if (this._stopped) break;
            yield;
        }
    }

    stepToToken(predicate: (token: RGXTokenOrPart<R>) => boolean = () => true) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const _ of this._stepToTokenIter(predicate)) { /* sync — no yield needed */ }
        return this;
    }

    async stepToTokenAsync(
        predicate: (token: RGXTokenOrPart<R, S, unknown>) => boolean = () => true,
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
        if ("reduced" in snap) this.reduced = snap.reduced!;
        if ("share" in snap) this.share = snap.share!;
        if ("captures" in snap) this.captures = snap.captures!;
        if ("namedCaptures" in snap) this.namedCaptures = snap.namedCaptures!;
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
            this.source, extClone(this.tokens, depthDecrement(1)), {
                startingSourcePosition: this.sourcePosition,
                reduced: extClone(this.reduced, depthDecrement(1)),
                share: extClone(this.share, depthDecrement(1)),
                infinite: this.infinite,
                looping: this.looping,
                contiguous: this.contiguous
            }
        );

        clone._tokenPosition = this.tokenPosition;
        clone.captures = extClone(this.captures, depthDecrement(1));
        clone._stopped = this._stopped;

        return clone;
    }
}

export function rgxWalker<R, S = unknown>(...args: ConstructorParameters<typeof RGXWalker<R, S>>) {
    return new RGXWalker<R, S>(...args);
};