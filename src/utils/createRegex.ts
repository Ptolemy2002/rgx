import { RGXInvalidRegexStringError } from "src/errors";
import { ExtRegExp } from "src/ExtRegExp";
import { assertValidVanillaRegexFlags } from "src/typeGuards";

export function createRegex(pattern: string, flags?: string): RegExp;
export function createRegex(pattern: string, flags: string, extended: false): RegExp;
export function createRegex(pattern: string, flags: string, extended: true): ExtRegExp;
export function createRegex(pattern: string, flags="", extended = false): RegExp {
    // ExtRegExp will handle validation of flags if extended is true, otherwise we validate them here
    if (!extended) assertValidVanillaRegexFlags(flags);

    try {
        if (extended) return new ExtRegExp(pattern, flags);
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