import { CloneDepth, depthDecrement, extClone } from "@ptolemy2002/immutability-utils";
import { RGXTokenCollection, RGXTokenCollectionInput } from "src/collection";
import { assertInRange } from "src/errors";
import { RGXConvertibleToken, RGXToken } from "src/types";
import { RGXPart, RGXCapture } from "./part";
import { assertRegexMatchesAtPosition, rgxa } from "src/index";
import { createAssertClassGuardFunction, createClassGuardFunction } from "src/internal";

export type RGXWalkerOptions<R> = {
    startingSourcePosition?: number;
    reduced?: R;
};

export class RGXWalker<R> implements RGXConvertibleToken {
    readonly source: string;
    _sourcePosition: number;

    readonly tokens: RGXTokenCollection;
    _tokenPosition: number;

    reduced: R;

    captures: RGXCapture[] = [];

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

    constructor(source: string, tokens: RGXTokenCollectionInput, options: RGXWalkerOptions<R> = {}) {
        this.source = source;
        this.sourcePosition = options.startingSourcePosition ?? 0;

        this.tokens = new RGXTokenCollection(tokens, "concat");
        this.tokenPosition = 0;

        this.reduced = options.reduced ?? null as unknown as R;
    }

    stop() {
        this._stopped = true;
    }

    atTokenEnd() {
        return this.tokenPosition >= this.tokens.length;
    }

    hasNextToken(predicate: (token: RGXToken) => boolean = () => true) {
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
        return this.tokens.at(this.tokenPosition);
    }

    remainingSource() {
        if (this.atSourceEnd()) return null;
        return this.source.slice(this.sourcePosition);
    }

    capture(token: RGXToken): string {
        const regex = rgxa([token]);
        const match = assertRegexMatchesAtPosition(regex, this.source, this.sourcePosition);
        this.sourcePosition += match.length;
        return match;
    }

    step(): RGXCapture | null {
        if (this.atTokenEnd()) return null;

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
        const raw = this.capture(token);
        const value = isPart ? token.transform(raw) : raw;
        const captureResult: RGXCapture = { raw, value };

        // Validate the part. If validation fails, it will throw an error, so nothing below will run.
        if (isPart) {
            token.validate(captureResult, this);
        }

        // Skip adding the capture if in silent mode.
        if (!silent) {
            this.captures.push(captureResult);
        }

        // Notify Part after capture
        if (isPart) {
            token.afterCapture?.(captureResult, token, this);
        }

        this.tokenPosition++;
        return captureResult;
    }

    stepToToken(predicate: (token: RGXToken) => boolean) {
        while (this.hasNextToken()) {
            this._stopped = false;

            if (predicate(this.currentToken()!)) break;
            this.step();

            if (this._stopped) break;
        }
    }

    stepToPart(predicate: (part: RGXPart<R>) => boolean = () => true) {
        // If currently at a Part, step past it first so repeated
        // calls advance to the next Part rather than getting stuck.
        if (this.currentToken() instanceof RGXPart) {
            this._stopped = false;
            this.step();
            if (this._stopped) return;
        }

        this.stepToToken(token => token instanceof RGXPart && predicate(token));
    }

    walk() {
        return this.stepToToken(() => false);
    }

    // When used as a convertible token, treat the walker as its collection.
    toRgx() {
        return this.tokens;
    }

    // Clone method
    clone(depth: CloneDepth="max") {
        if (depth === 0) return this;
        const clone = new RGXWalker(
            this.source, this.tokens.clone(depthDecrement(1)), {
                startingSourcePosition: this.sourcePosition,
                reduced: extClone(this.reduced, depthDecrement(1))
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
}