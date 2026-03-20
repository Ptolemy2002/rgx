import { CloneDepth, depthDecrement, extClone } from "@ptolemy2002/immutability-utils";
import { RGXTokenCollection, RGXTokenCollectionInput } from "src/collection";
import { assertInRange, RGXInvalidWalkerError, RGXPartValidationFailedError, RGXRegexNotMatchedAtPositionError } from "src/errors";
import { RGXToken } from "src/types";
import { RGXPart, RGXCapture } from "./part";
import { resolveRGXToken } from "src/resolve";
import { assertRegexMatchesAtPosition, createRegex } from "src/utils";
import { isRGXArrayToken } from "src/typeGuards";
import { RGXClassUnionToken, RGXGroupToken } from "src/class";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";

export type RGXWalkerOptions<R, S = unknown> = {
    startingSourcePosition?: number;
    reduced?: R;
    share?: S;
    infinite?: boolean;
    looping?: boolean;
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

function isMatchError(e: unknown): e is RGXRegexNotMatchedAtPositionError | RGXPartValidationFailedError {
    return e instanceof RGXRegexNotMatchedAtPositionError || e instanceof RGXPartValidationFailedError;
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

    private _stopped: boolean = false;

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
    }

    stop() {
        this._stopped = true;
        return this;
    }

    atTokenEnd() {
        return this.tokenPosition >= this.tokens.length;
    }

    hasNextToken(predicate: (token: RGXToken | RGXPart<R, S, unknown>) => boolean = () => true) {
        return !this.atTokenEnd() && predicate(this.currentToken()!);
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
        if (this.atTokenEnd()) return null;
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
        const match = assertRegexMatchesAtPosition(regex, this.source, this.sourcePosition, 10, true);
        this.sourcePosition += match[0].length;
        return includeMatch ? match : match[0];
    }

    private advanceToken() {
        if (!this.infinite || this.tokenPosition < this.tokens.length - 1) {
            this.tokenPosition++;
            if (this.looping && this.atTokenEnd()) {
                this.tokenPosition = 0;
            }
        }
    }

    private determineBranch(capture: RegExpExecArray): number {
        for (let i = 0; i < capture.length - 1; i++) {
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
            if (part !== null && e instanceof RGXRegexNotMatchedAtPositionError) {
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
        // If this happens, afterCapture itself stopped the walker, so we just need to respect that.
        if (this.stopped) return "stop";

        if (!silent && (control === "skip" || control === "silent" || control === "stop-silent")) {
            this.unregisterLastCapture(token);
        }

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

        const token = this.currentToken()!;
        const isPart = token instanceof RGXPart;
        let silent = false;

        if (isPart) {
            const dir = this.handleBeforeCapture(token);
            if (dir === "stop") { this._stopped = true; return null; }
            if (dir === "skip") { this.advanceToken(); return null; }
            silent = dir === "silent";
        }

        const start = this.sourcePosition;
        const branchedToken = isPart ? createBranchGroups(token.token) : createBranchGroups(token);
        const captureAttempt = this.attemptCapture(branchedToken, isPart ? token : null);
        if (captureAttempt === "stop") { this._stopped = true; return null; }
        if (captureAttempt === "skip") { this.advanceToken(); return null; }

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

            if (predicate(this.currentToken()!)) break;
            this.step();

            if (this._stopped) break;
        }
        return this;
    }

    stepToPart(predicate: (part: RGXPart<R, S, unknown>) => boolean = () => true) {
        // If currently at a Part, step past it first so repeated
        // calls advance to the next Part rather than getting stuck.
        if (this.currentToken() instanceof RGXPart) {
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
                looping: this.looping
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