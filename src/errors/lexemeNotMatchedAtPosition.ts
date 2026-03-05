import { assertInRange, RGXError, RGXPartValidationFailedError, RGXRegexNotMatchedAtPositionError } from "src/errors";

export type LexemeNotMatchedCauseError = RGXRegexNotMatchedAtPositionError | RGXPartValidationFailedError;
export type LexemeNotMatchedCause = {
    id: string;
    error: LexemeNotMatchedCauseError;
};

export function isLexemeNotMatchedCauseError(error: unknown): error is LexemeNotMatchedCauseError {
    return error instanceof RGXRegexNotMatchedAtPositionError || error instanceof RGXPartValidationFailedError;
}

export class RGXLexemeNotMatchedAtPositionError extends RGXError {
    source: string;
    mode: string;
    _position: number;
    contextSize: number | null;
    causes: LexemeNotMatchedCause[];

    get position() {
        return this._position;
    }

    set position(value: number) {
        assertInRange(value, { min: 0, max: this.source.length }, "position is outside the bounds of the source string");
        this._position = value;
    }

    constructor(message: string, source: string, mode: string, position: number, causes: LexemeNotMatchedCause[] = [], contextSize: number | null = null) {
        super(message, 'LEXEME_NOT_MATCHED_AT_POSITION');
        this.name = 'RGXLexemeNotMatchedAtPositionError';
        this.source = source;
        this.mode = mode;
        this.position = position;
        this.causes = causes;
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

    calcMessage(message: string) {
        let context = this.sourceContext();
        if (this.contextSize !== null) {
            if (this.hasLeftContext()) context = `...${context}`;
            if (this.hasRightContext()) context = `${context}...`;
        }

        return `${message}; Mode: ${this.mode}, Position: ${this.position}, Context: ${context}`;
    }
}