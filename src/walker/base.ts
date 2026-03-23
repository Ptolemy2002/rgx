import { CloneDepth, depthDecrement, extClone } from "@ptolemy2002/immutability-utils";
import { RGXTokenCollection, RGXTokenCollectionInput } from "src/collection";
import { assertInRange, RGXInvalidWalkerError, RGXPartValidationFailedError, RGXRegexNotMatchedAfterPositionError, RGXRegexNotMatchedAtPositionError } from "src/errors";
import { RGXToken } from "src/types";
import { RGXPart, RGXCapture } from "./part";
import { resolveRGXToken } from "src/resolve";
import { assertRegexMatchesAfterPosition, assertRegexMatchesAtPosition, createRegex } from "src/utils";
import { isRGXArrayToken } from "src/typeGuards";
import { RGXClassUnionToken, RGXGroupToken } from "src/class";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";
import { RGXCurrentTokenNotFoundError } from "src/errors/currentTokenNotFound";

export type RGXWalkerOptions<R, S = unknown> = {
    startingSourcePosition?: number;
    reduced?: R;
    share?: S;
    infinite?: boolean;
    looping?: boolean;
    contiguous?: boolean;
};

function createBranchGroups(tokens: RGXTokenCollectionInput): RGXToken {
    if (
        (tokens instanceof RGXTokenCollection && tokens.mode === "union") ||
        RGXClassUnionToken.check(tokens)
    ) return createBranchGroups(tokens.tokens);

    if (isRGXArrayToken(tokens)) {
        const newTokens = tokens.map((token, i) => {
            return new RGXGroupToken({name: `rgx_branch_${i}`}, [token]);
        });

        return new RGXClassUnionToken(newTokens);
    } else {
        return tokens;
    }
}

function isMatchError(e: unknown): e is RGXRegexNotMatchedAtPositionError | RGXRegexNotMatchedAfterPositionError | RGXPartValidationFailedError {
    return (
        e instanceof RGXRegexNotMatchedAtPositionError ||
        e instanceof RGXRegexNotMatchedAfterPositionError ||
        e instanceof RGXPartValidationFailedError
    );
}

export type RGXTokenOrPart<R, S = unknown, T = unknown> = RGXToken | RGXPart<R, S, T>;
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

    lastCapture(): RGXCapture | null {
        if (this.captures.length === 0) return null;
        return this.captures[this.captures.length - 1]!;
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
        const regex = createRegex(resolveRGXToken(RGXPart.check(token) ? token.token : token));
        
        const args = [regex, this.source, this.sourcePosition, 10, true] as const;
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
        return includeMatch ? match : match[0];
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
            if (capture.groups?.[`rgx_branch_${i}`] !== undefined) return i;
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
        branchedToken: RGXTokenOrPart<R, S>,
        part: RGXPart<R, S, unknown> | null
    ): RegExpExecArray | Exclude<RGXWalkerStepDirective, "silent"> {
        try {
            return this.capture(branchedToken, true);
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
        captureResult: RGXCapture<unknown>,
        start: number
    ): Exclude<RGXWalkerStepDirective, "silent"> | null {
        try {
            token.validate(captureResult, { part: token, walker: this });
            return null;
        } catch (e) {
            this.sourcePosition = start; // Reset source position on validation failure
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
        silent: boolean, start: number
    ): Exclude<RGXWalkerStepDirective, "silent"> | null {
        const control = token.afterCapture?.(captureResult, { part: token, walker: this });

        if (!silent && (control === "skip" || control === "silent" || control === "stop-silent")) {
            this.unregisterLastCapture(token);
        }

        // If this happens, afterCapture itself stopped the walker, so we just need to respect that.
        if (this.stopped) return "stop";

        if (control === "skip") {
            this.sourcePosition = start;
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

        const branchedToken = isPart ? createBranchGroups(token.token) : createBranchGroups(token);

        let captureAttempt: ReturnType<typeof this.attemptCapture>;
        try {
            captureAttempt = this.attemptCapture(branchedToken, isPart ? token : null);
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
            const dir = this.validateCapture(token, captureResult, start);
            if (dir === "stop") { this._stopped = true; return null; }
            if (dir === "skip") { this.advanceToken(); return null; }
        }

        if (!silent) this.registerCapture(captureResult, token);

        if (isPart) {
            const dir = this.handleAfterCapture(token, captureResult, silent, start);
            if (dir === "stop") { this.advanceToken(); this._stopped = true; return null; }
            if (dir === "skip") { this.advanceToken(); return null; }
        }

        this.advanceToken();
        return captureResult;
    }

    stepToToken(predicate: (token: RGXTokenOrPart<R>) => boolean) {
        while (this.hasNextToken()) {
            this._stopped = false;

            if (predicate(this.currentToken())) break;
            this.step();

            if (this._stopped) break;
        }
        return this;
    }

    stepToPart(predicate: (part: RGXPart<R, S, unknown>) => boolean = () => true) {
        // If currently at a Part, step past it first so repeated
        // calls advance to the next Part rather than getting stuck.
        if (this.hasNextToken() && this.currentToken() instanceof RGXPart) {
            this._stopped = false;
            this.step();
            if (this._stopped) return this;
        }

        this.stepToToken(token => token instanceof RGXPart && predicate(token));
        return this;
    }

    walk() {
        this.stepToToken(() => false);
        return this.reduced;
    }

    tryWalk(): boolean {
        const prevSourcePosition = this.sourcePosition;
        const prevTokenPosition = this.tokenPosition;

        try {
            this.walk();
            return true;
        } catch (e) {
            this.sourcePosition = prevSourcePosition;
            this.tokenPosition = prevTokenPosition;

            if (isMatchError(e)) {
                return false;
            }
            
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