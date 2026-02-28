import { CloneDepth, depthDecrement, extClone } from "@ptolemy2002/immutability-utils";
import { RGXTokenCollection, RGXTokenCollectionInput } from "src/collection";
import { assertInRange } from "src/errors";
import { RGXConvertibleToken, RGXToken } from "src/types";
import { RGXPart } from "./part";
import { assertRegexMatchesAtPosition, rgxa } from "src/index";
import { createAssertClassGuardFunction, createClassGuardFunction } from "src/internal";

export type RGXWalkerOptions<R> = {
    startingSourcePosition?: number;
    reducedCurrent?: R;
};

export type RGXWalkerFlags = {
    stopped: boolean;
    skipped: boolean;
    nonCapture: boolean;
};

export class RGXWalker<R> implements RGXConvertibleToken {
    readonly source: string;
    _sourcePosition: number;

    readonly tokens: RGXTokenCollection;
    _tokenPosition: number;
    
    reducedCurrent: R;

    capturedStrings: string[] = [];

    flags: RGXWalkerFlags = {
        stopped: false,
        skipped: false,
        nonCapture: false
    };

    static check = createClassGuardFunction(RGXWalker);
    static assert = createAssertClassGuardFunction(RGXWalker);

    get sourcePosition() {
        return this._sourcePosition;
    }

    set sourcePosition(value: number) {
        assertInRange(value, { min: 0, max: this.source.length, inclusiveRight: false }, "sourcePosition is outside the bounds of the source string");
        this._sourcePosition = value;
    }

    get tokenPosition() {
        return this._tokenPosition;
    }

    set tokenPosition(value: number) {
        assertInRange(value, { min: 0, max: this.tokens.length }, "tokenPosition is outside the bounds of the token collection");
        this._tokenPosition = value;
    }

    constructor(source: string, tokens: RGXTokenCollectionInput, options: RGXWalkerOptions<R> = {}) {
        this.source = source;
        this.sourcePosition = options.startingSourcePosition ?? 0;
        
        this.tokens = new RGXTokenCollection(tokens, "concat");
        this.tokenPosition = 0;

        this.reducedCurrent = options.reducedCurrent ?? null as unknown as R;
    }

    resetFlags() {
        this.flags.stopped = false;
        this.flags.skipped = false;
        this.flags.nonCapture = false;
    }

    stop() {
        this.flags.stopped = true;
    }

    skip() {
        this.flags.skipped = true;
    }

    preventCapture() {
        this.flags.nonCapture = true;
    }

    atTokenEnd() {
        return this.tokenPosition >= this.tokens.length;
    }

    hasNextToken(predicate: (token: RGXToken) => boolean = () => true) {
        return !this.atTokenEnd() && predicate(this.nextToken()!);
    }

    atSourceEnd() {
        return this.sourcePosition >= this.source.length - 1;
    }

    hasNextSource(predicate: (rest: string) => boolean = () => true) {
        return !this.atSourceEnd() && predicate(this.remainingSource()!);
    }

    hasCapturedStrings(minCount: number = 1) {
        return this.capturedStrings.length >= minCount;
    }

    getLastCapturedString() {
        if (!this.hasCapturedStrings()) return null;
        return this.capturedStrings[this.capturedStrings.length - 1];
    }

    nextToken() {
        if (this.tokenPosition >= this.tokens.length) return null;
        return this.tokens.at(this.tokenPosition);
    }

    remainingSource() {
        if (this.sourcePosition >= this.source.length - 1) return null;
        return this.source.slice(this.sourcePosition);
    }

    capture(token: RGXToken) {
        const regex = rgxa([token]);
        const match = assertRegexMatchesAtPosition(regex, this.source, this.sourcePosition);
        if (!this.flags.nonCapture) this.capturedStrings.push(match);

        if (this.sourcePosition < this.source.length - match.length) this.sourcePosition += match.length;
        else this.sourcePosition = this.source.length - 1; // Move to the end of the source if the match goes beyond it
        
        return match;
    }

    step(flagReset = true) {
        if (flagReset) this.resetFlags();

        if (!this.hasNextToken()) return null;
        const token = this.nextToken()!;

        if (token instanceof RGXPart) token.triggerEvent("pre-capture", this);

        let captured: string | null = null;
        if (!this.flags.skipped) {
            captured = this.capture(token);
            if (token instanceof RGXPart && !this.flags.nonCapture) token.triggerEvent("post-capture", this);
        }

        this.tokenPosition++;
        return captured;
    }

    stepToToken(predicate: (token: RGXToken) => boolean) {
        while (this.hasNextToken()) {
            this.resetFlags();

            if (predicate(this.nextToken()!)) break;
            this.step(false);
            
            if (this.flags.stopped) break;
        }
    }

    stepToPart(predicate: (part: RGXPart<R>) => boolean = () => true) {
        // If we're currently at a part, step once so that we can get to the next one.
        if (this.nextToken() instanceof RGXPart) this.step();
        if (this.flags.stopped) return;
        
        this.stepToToken(token => token instanceof RGXPart && predicate(token));
    }

    walk() {
        return this.stepToToken(() => false);
    }

    // When used as a convertible token, just treat the walker as
    // a collection.
    toRgx() {
        return this.tokens;
    }

    // Clone method
    clone(depth: CloneDepth="max") {
        if (depth === 0) return this;
        const clone = new RGXWalker(
            this.source, this.tokens.clone(depthDecrement(1)), {
                startingSourcePosition: this.sourcePosition,
                reducedCurrent: extClone(this.reducedCurrent, depthDecrement(1))
            }
        );

        clone._tokenPosition = this.tokenPosition;
        clone.capturedStrings = extClone(this.capturedStrings, depthDecrement(1));
        clone.flags = extClone(this.flags, depthDecrement(1));

        return clone;
    }
}

export function rgxWalker<R>(...args: ConstructorParameters<typeof RGXWalker<R>>) {
    return new RGXWalker(...args);
}