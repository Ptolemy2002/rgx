import { RGXError } from "./base";
import { assertInRange } from "./outOfBounds";

export class RGXRegexNotMatchedAtPositionError extends RGXError {
    pattern: RegExp;
    source: string;
    _position: number;
    contextSize: number | null;

    set position(value: number) {
        assertInRange(value, { min: 0, max: this.source.length, inclusiveRight: false }, "position is outside the bounds of the source string");
        this._position = value;
    }

    get position() {
        return this._position;
    }

    constructor(message: string, pattern: RegExp, source: string, position: number, contextSize: number | null = null) {
        super(message, 'REGEX_NOT_MATCHED_AT_POSITION');

        this.name = 'RGXRegexNotMatchedAtPositionError';
        this.pattern = pattern;
        this.source = source;
        this.position = position;
        this.contextSize = contextSize;
    }

    sourceContext() {
        if (this.hasFullContext()) return this.source;
        const start = Math.max(0, this.position - this.contextSize!);
        const end = Math.min(this.source.length, this.position + this.contextSize!);
        return this.source.slice(start, end);
    }

    hasLeftContext() {
        if (this.contextSize === null) return false;
        return this.position - this.contextSize >= 0;
    }

    hasRightContext() {
        if (this.contextSize === null) return false;
        return this.position + this.contextSize <= this.source.length;
    }

    hasFullContext() {
        return !this.hasLeftContext() && !this.hasRightContext();
    }

    calcMessage(message: string): string {
        let context = this.sourceContext();
        if (this.contextSize !== null) {
            if (this.hasLeftContext()) context = `...${context}`;
            if (this.hasRightContext()) context = `${context}...`;
        }

        return `${message}; Pattern: ${this.pattern.toString()}, Position: ${this.position}, Context: ${context}`;
    }
}