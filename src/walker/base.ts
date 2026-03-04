import { CloneDepth, depthDecrement, extClone } from "@ptolemy2002/immutability-utils";
import { RGXTokenCollection, RGXTokenCollectionInput } from "src/collection";
import { assertInRange } from "src/errors";
import { RGXToken } from "src/types";
import { RGXPart, RGXCapture } from "./part";
import { assertRegexMatchesAtPosition, isRGXArrayToken, rgxa, RGXClassUnionToken, RGXGroupToken } from "src/index";
import { createAssertClassGuardFunction, createClassGuardFunction } from "src/internal";

export type RGXWalkerOptions<R> = {
    startingSourcePosition?: number;
    reduced?: R;
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

export type RGXTokenOrPart<R, T = unknown> = RGXToken | RGXPart<R, T>;

export class RGXWalker<R> {
    readonly source: string;
    _sourcePosition: number;

    readonly tokens: RGXTokenOrPart<R>[];
    _tokenPosition: number;

    reduced: R;

    captures: RGXCapture[] = [];
    namedCaptures: Record<string, RGXCapture[]> = {};

    infinite: boolean;
    looping: boolean;

    private _stopped: boolean = false;

    static check = createClassGuardFunction(RGXWalker);
    static assert = createAssertClassGuardFunction(RGXWalker);

    get sourcePosition() {
        return this._sourcePosition;
    }

    set sourcePosition(value: number) {
        assertInRange(value, { min: 0, max: this.source.length }, "sourcePosition is outside the bounds of the source string");
        this._sourcePosition = value;
    }

    get tokenPosition() {
        return this._tokenPosition;
    }

    set tokenPosition(value: number) {
        assertInRange(value, { min: 0, max: this.tokens.length }, "tokenPosition is outside the bounds of the token collection");
        this._tokenPosition = value;
    }

    get stopped() {
        return this._stopped;
    }

    constructor(source: string, tokens: RGXTokenOrPart<R>[], options: RGXWalkerOptions<R> = {}) {
        this.source = source;
        this.sourcePosition = options.startingSourcePosition ?? 0;
        this.tokens = tokens;
        
        this.tokenPosition = 0;

        this.reduced = options.reduced ?? null as unknown as R;
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

    hasNextToken(predicate: (token: RGXToken | RGXPart<R>) => boolean = () => true) {
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

    capture(token: RGXTokenOrPart<R>, includeMatch: true): RegExpExecArray;
    capture(token: RGXTokenOrPart<R>, includeMatch?: false): string;
    capture(token: RGXTokenOrPart<R>, includeMatch = false): string | RegExpExecArray {
        const regex = rgxa([RGXPart.check(token) ? token.token : token]);
        const match = assertRegexMatchesAtPosition(regex, this.source, this.sourcePosition, 10, true);
        this.sourcePosition += match[0].length;
        return includeMatch ? match : match[0];
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

        // Ask Part what to do — control flow via return values, not flags.
        if (isPart) {
            const control = token.beforeCapture?.(token, this);

            if (control === "stop") {
                this._stopped = true;
                return null;
            }

            if (control === "skip") {
                this.tokenPosition++;
                return null;
            }

            if (control === "silent") {
                silent = true;
            }
        }

        // Capture the match
        const start = this.sourcePosition;

        let branchedToken: RGXTokenOrPart<R>;

        if (isPart) branchedToken = createBranchGroups(token.token);
        else branchedToken = createBranchGroups(token);

        const capture = this.capture(branchedToken, true);

        const raw = isPart ? token.rawTransform(capture[0]) : capture[0];
        const end = this.sourcePosition;
        const value = isPart ? token.transform(raw) : raw;

        let branch = 0;
        // Determine branch index for captureResult by finding the first index
        // with non-undefined match group.
        for (let i = 0; i < capture.length; i++) {
            const branchKey = `rgx_branch_${i}`;
            if (capture.groups && capture.groups[branchKey] !== undefined) {
                branch = i;
                break;
            }
        }

        const captureResult: RGXCapture<typeof value> = {
            raw, value, start, end, branch,
            ownerId: isPart && token.hasId() ? token.id : null,
            groups: capture.groups ?? null
        };

        // Validate the part. If validation fails, it will throw an error, so nothing below will run.
        if (isPart) {
            token.validate(captureResult, this);
        }

        // Skip adding the capture if in silent mode.
        if (!silent) {
            this.captures.push(captureResult);
            if (isPart && token.hasId()) {
                if (!(token.id in this.namedCaptures)) this.namedCaptures[token.id] = [];
                this.namedCaptures[token.id]!.push(captureResult);
            }
        }

        // Notify Part after capture
        if (isPart) {
            token.afterCapture?.(captureResult, token, this);
        }

        if (!this.infinite || this.tokenPosition < this.tokens.length - 1) {
            this.tokenPosition++;
            if (this.looping && this.atTokenEnd()) {
                this.tokenPosition = 0;
            }
        }
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

    stepToPart(predicate: (part: RGXPart<R, unknown>) => boolean = () => true) {
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
        return this.stepToToken(() => false);
    }

    // Clone method
    clone(depth: CloneDepth="max") {
        if (depth === 0) return this;
        const clone = new RGXWalker(
            this.source, extClone(this.tokens, depthDecrement(1)), {
                startingSourcePosition: this.sourcePosition,
                reduced: extClone(this.reduced, depthDecrement(1)),
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

export function rgxWalker<R>(...args: ConstructorParameters<typeof RGXWalker<R>>) {
    return new RGXWalker(...args);
};