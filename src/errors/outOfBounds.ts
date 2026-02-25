import { RGXError } from "./base";
import { RangeObject } from "src/types";

export class RGXOutOfBoundsError extends RGXError {
    got: number;
    _min: number | null;
    _max: number | null;
    inclusiveLeft: boolean;
    inclusiveRight: boolean;

    get min() {
        return this._min;
    }

    set min(value: number | null) {
        this._min = value;
        if (this._max !== null && value !== null && value > this._max) {
            this._max = value;
        }
    }

    get max() {
        return this._max;
    }

    set max(value: number | null) {
        this._max = value;
        if (this._min !== null && value !== null && value < this._min) {
            this._min = value;
        }
    }

    constructor(message: string, got: number, {min=null, max=null, inclusiveLeft=true, inclusiveRight=true}: RangeObject = {}) {
        super(message, 'OUT_OF_BOUNDS');
        this.name = 'RGXOutOfBoundsError';
        this.got = got;
        this.min = min;
        this.max = max;
        this.inclusiveLeft = inclusiveLeft;
        this.inclusiveRight = inclusiveRight;
    }

    failedAtMin() {
        return this.min !== null && (this.inclusiveLeft ? this.got < this.min : this.got <= this.min);
    }

    failedAtMax() {
        return this.max !== null && (this.inclusiveRight ? this.got > this.max : this.got >= this.max);
    }

    failedAtAny() {
        return this.failedAtMin() || this.failedAtMax();
    }

    calcMessage(message: string) {
        const rangeParts: string[] = [];
        if (this.min !== null) {
            if (this.inclusiveLeft) rangeParts.push(`>= ${this.min}`);
            else rangeParts.push(`> ${this.min}`);
        }

        if (this.max !== null) {
            if (this.inclusiveRight) rangeParts.push(`<= ${this.max}`);
            else rangeParts.push(`< ${this.max}`);
        }

        const rangeStr = rangeParts.join(" and ");

        // Determine which one was failed
        if (!this.failedAtAny()) {
            return `${message}; Got: [${this.got}]; Expected: [${rangeStr}]`;
        } else if (this.failedAtMin()) {
            let thirdPart: string;
            if (!this.inclusiveLeft && this.got === this.min) thirdPart = `${this.got} == ${this.min}`;
            else thirdPart = `${this.got} < ${this.min}`;

            return `${message}; Got: [${this.got}]; Expected: [${rangeStr}]; ${thirdPart}`;
        } else {
            let thirdPart: string;
            if (!this.inclusiveRight && this.got === this.max) thirdPart = `${this.got} == ${this.max}`;
            else thirdPart = `${this.got} > ${this.max}`;

            return `${message}; Got: [${this.got}]; Expected: [${rangeStr}]; ${thirdPart}`;
        }
    }
}

export function isInRange(value: number, {min=null, max=null, inclusiveLeft=true, inclusiveRight=true}: RangeObject={}): boolean {
    if (min !== null) {
        if (inclusiveLeft) {
            if (value < min) return false;
        } else {
            if (value <= min) return false;
        }
    }

    if (max !== null) {
        if (inclusiveRight) {
            if (value > max) return false;
        } else {
            if (value >= max) return false;
        }
    }

    return true;
}

export function assertInRange(value: number, range: RangeObject={}, message: string = "Value out of bounds") {
    if (!isInRange(value, range)) {
        throw new RGXOutOfBoundsError(message, value, range);
    }
}