import { RGXInvalidRegexStringError } from "src/errors";
import { ExtRegExp } from "src/ExtRegExp";
import { assertValidVanillaRegexFlags } from "src/typeGuards";

export function createRegex(pattern: string, flags?: string): RegExp;
export function createRegex(pattern: string, flags: string, extended: false): RegExp;
export function createRegex(pattern: string, flags: string, extended: true, exactMarkers?: boolean): ExtRegExp;
// exactMarkers is passed on to ExtRegExp, and only applies when extended is true.
export function createRegex(pattern: string, flags="", extended = false, exactMarkers = false): RegExp {
    // ExtRegExp will handle validation of flags if extended is true, otherwise we validate them here
    if (!extended) assertValidVanillaRegexFlags(flags);

    try {
        if (extended) return new ExtRegExp(pattern, flags, null, exactMarkers);
        else return new RegExp(pattern, flags);
    } catch (e: unknown) {
        if (e instanceof SyntaxError) {
            throw new RGXInvalidRegexStringError("Invalid regex string", pattern, e);
        }

        // The invalid flags error thrown by ExtRegExp
        // will be rethrown here.
        throw e;
    }
}