import { RGXError } from "./base";

// Why a backreference can never match what its group captured.
export type RGXInvalidBackreferenceReason =
    // No group has the name, or there are fewer groups than the number.
    | "missing-group"
    // The reference is matched before its group, so the group hasn't captured anything yet.
    | "before-group"
    // The reference is inside its own group, so the group hasn't finished capturing yet.
    | "inside-group"
    // The reference and its group are in different alternatives, so only one of them can be part of a match.
    | "other-branch"
    // The group is inside a negative lookaround that the reference isn't, so its captures are always discarded.
    | "negative-lookaround"
    // The reference is numeric and the walker step is a union, whose branches the walker wraps in groups that shift
    // every group number.
    | "numeric-in-branches";

export class RGXInvalidBackreferenceError extends RGXError {
    reference: string | number;
    reason: RGXInvalidBackreferenceReason;
    got: string;

    constructor(message: string, reference: string | number, reason: RGXInvalidBackreferenceReason, got: string) {
        super(message, 'INVALID_BACKREFERENCE');
        this.name = 'RGXInvalidBackreferenceError';
        this.reference = reference;
        this.reason = reason;
        this.got = got;
    }

    calcMessage(message: string) {
        const reference = typeof this.reference === "string" ? `\\k<${this.reference}>` : `\\${this.reference}`;
        return `${message}; Reference: ${reference}; Reason: ${this.reason}; Got: ${JSON.stringify(this.got)}`;
    }
}
