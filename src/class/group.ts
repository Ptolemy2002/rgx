import { RGXClassToken } from "./base";
import { atomicRegexSource, createConstructFunction, createRegexPiece, isNonConsumingRegexSource, localizableVanillaRegexFlagDiff, withRGXInsertionFlags, withoutRGXInsertionChecks } from "src/internal";
import { rgxConcat } from "src/concat";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";
import { assertValidIdentifier, assertValidRegexLocalizableFlags } from "src/typeGuards";
import { CloneDepth, depthDecrement, extClone } from "@ptolemy2002/immutability-utils";
import { RGXInsertionContext, RGXJSONClassToken, RGXJSONObject, RGXJSONToken, RGXJSONValue, RGXToken, ValidRegexFlags } from "src/types";
import { RGXError, RGXInvalidIdentifierError } from "src/errors";
import { createRGXJSONClassToken, rgxJSONClassArgs, rgxTokenFromJSON, rgxTokenToJSON } from "src/json";
import { isRGXJSONToken } from "src/typeGuards";
import { rejectRGXAtomicInLookbehind } from "./atomic";

export type RGXGroupTokenArgs = {
    name?: string | null;
    capturing?: boolean;
    // The localizable flags in effect inside the group, or null to inherit the flags around it.
    flags?: string | null;
    aliases?: string[];
    // Whether the contents are matched atomically: the first way they can match, without being backtracked into.
    atomic?: boolean;
};

function parseGroupJSONArgs(args: RGXJSONValue[]): [RGXGroupTokenArgs?, RGXJSONToken?] | string {
    if (args.length > 2) return "Expected at most 2 arguments (args, tokens).";

    const [groupArgs, tokens] = args;
    if (groupArgs !== undefined) {
        if (typeof groupArgs !== "object" || groupArgs === null || Array.isArray(groupArgs)) return "Argument 0 (args) must be an object.";
        if (groupArgs.name !== undefined && groupArgs.name !== null && typeof groupArgs.name !== "string") return "Argument 0 (args) must have a string or null name, if present.";
        if (groupArgs.capturing !== undefined && typeof groupArgs.capturing !== "boolean") return "Argument 0 (args) must have a boolean capturing property, if present.";
        if (groupArgs.flags !== undefined && groupArgs.flags !== null && typeof groupArgs.flags !== "string") return "Argument 0 (args) must have a string or null flags property, if present.";
        if (groupArgs.aliases !== undefined && (!Array.isArray(groupArgs.aliases) || groupArgs.aliases.some(alias => typeof alias !== "string"))) return "Argument 0 (args) must have an array of strings as its aliases property, if present.";
        if (groupArgs.atomic !== undefined && typeof groupArgs.atomic !== "boolean") return "Argument 0 (args) must have a boolean atomic property, if present.";
    }

    if (tokens !== undefined && !isRGXJSONToken(tokens, false)) return "Argument 1 (tokens) must be a JSON token.";
    return [groupArgs as RGXGroupTokenArgs | undefined, tokens];
}

export class RGXGroupToken extends RGXClassToken {
    tokens: RGXToken[];
    _name: string | null = null;
    _aliases: string[] = [];
    _flags: string | null = null;
    _capturing: boolean = true;
    // Set with the atomic option. Named differently, since atomic() is a method of every class token.
    isAtomic: boolean;

    static check = createRGXClassGuardFunction(RGXGroupToken);
    static assert = createAssertRGXClassGuardFunction(RGXGroupToken);

    get name() {
        return this._name;
    }

    set name(value: string | null) {
        if (value === null) {
            // Aliases are extra names for the group, so they can't outlive its name.
            this._aliases = [];
        } else {
            assertValidIdentifier(value);
            if (this._aliases.includes(value)) throw new RGXInvalidIdentifierError("Group name is already one of the group's aliases", value);
        }

        this._name = value;
    }

    get aliases(): string[] {
        // A copy, so the list can't be changed without validation.
        return [...this._aliases];
    }

    set aliases(value: string[]) {
        // Without a name, the first alias becomes the name instead.
        const [name, ...aliases] = this._name === null ? value : [this._name, ...value];
        if (name === undefined) return;

        const seen = new Set<string>();
        for (const alias of [name, ...aliases]) {
            assertValidIdentifier(alias);
            if (seen.has(alias)) throw new RGXInvalidIdentifierError("Duplicate group name", alias);
            seen.add(alias);
        }

        this._name = name;
        this._aliases = aliases;
    }

    get capturing() {
        // Any named group is automatically capturing
        return this.name !== null || this._capturing;
    }

    set capturing(value: boolean) {
        if (!value) this.name = null; // Non-capturing groups cannot have names
        this._capturing = value;
    }

    // The name followed by the aliases, in the order they wrap the group's contents (outermost first). Empty when the
    // group has no name.
    allNames(): string[] {
        return this._name === null ? [] : [this._name, ...this._aliases];
    }

    addAlias(alias: string) {
        this.aliases = [...this._aliases, alias];
    }

    get flags() {
        return this._flags;
    }

    set flags(value: string | null) {
        if (value !== null) assertValidRegexLocalizableFlags(value);
        this._flags = value;
    }

    constructor ({ name = null, capturing = true, flags = null, aliases = [], atomic = false }: RGXGroupTokenArgs = {}, tokens: RGXToken = []) {
        super();
        this.name = name;
        this.aliases = aliases;
        this.capturing = capturing;
        this.flags = flags;
        this.isAtomic = atomic;

        // An array lists the tokens to concatenate. Anything else, including a union, is a single token.
        this.tokens = Array.isArray(tokens) ? [...tokens] : [tokens];
    }

    // An atomic group is emulated with a backreference, which consumes characters whenever the contents do, so the
    // contents decide.
    get rgxIsRepeatable(): boolean | undefined {
        if (!this.isAtomic) return undefined;
        try {
            return !isNonConsumingRegexSource(withoutRGXInsertionChecks(() => rgxConcat(this.tokens)));
        } catch (err) {
            if (err instanceof RGXError) return true;

            // This is ignored because I don't know what kind of
            // unexpected errors might happen.
            /* istanbul ignore next */
            throw err;
        }
    }

    rgxAcceptInsertion(context: RGXInsertionContext): string | boolean {
        return this.isAtomic ? rejectRGXAtomicInLookbehind(context) : true;
    }

    toRgx(currentFlags: string = '') {
        // The group's flags replace the localizable flags in effect for the tokens inside.
        const innerFlags = (flags: string) => this.flags !== null ? flags.replace(/[ims]/g, '') + this.flags : flags;

        let result: string = withRGXInsertionFlags(
            flags => innerFlags(flags) as ValidRegexFlags,
            () => rgxConcat(this.tokens, true, innerFlags(currentFlags))
        );

        // An atomic group of nothing has nothing to backtrack into.
        const atomic = this.isAtomic && result !== '';
        if (atomic) result = atomicRegexSource(result);

        // Only the flags that change where the group is placed need a modifier.
        const flagDiff = this.flags === null ? '' : localizableVanillaRegexFlagDiff(currentFlags, this.flags);

        if (this.name !== null) {
            // Each alias is another named group, nested inside the name in order.
            for (const name of this.allNames().reverse()) result = `(?<${name}>${result})`;
        } else if (!this.capturing) {
            // The atomic emulation is a sequence that the resolver groups wherever it needs to.
            if (!(atomic && flagDiff === '')) result = `(?${flagDiff}:${result})`;
            return createRegexPiece(result, currentFlags);
        } else {
            result = `(${result})`;
        }

        if (flagDiff !== '') result = `(?${flagDiff}:${result})`;

        return createRegexPiece(result, currentFlags);
    }

    clone(depth: CloneDepth="max") {
        if (depth === 0) return this;
        return new RGXGroupToken({ name: this.name, capturing: this._capturing, flags: this.flags, aliases: this.aliases, atomic: this.isAtomic }, extClone(this.tokens, depthDecrement(depth, 1)));
    }

    static fromJSON(json: RGXJSONClassToken): RGXGroupToken {
        const [groupArgs, tokens] = rgxJSONClassArgs(json, "RGXGroupToken", parseGroupJSONArgs);
        return new RGXGroupToken(groupArgs ?? {}, tokens === undefined ? [] : rgxTokenFromJSON(tokens));
    }

    toJSON(): RGXJSONClassToken {
        const args: RGXJSONObject = { name: this.name, capturing: this._capturing, flags: this.flags };
        // Only included when there are any, so JSON for groups without aliases is unchanged.
        if (this._aliases.length > 0) args.aliases = this.aliases;
        if (this.isAtomic) args.atomic = true;

        return createRGXJSONClassToken("RGXGroupToken", [
            args,
            rgxTokenToJSON(this.tokens)
        ]);
    }
}

export const rgxGroup = createConstructFunction(RGXGroupToken);

// A non-capturing group that matches its tokens atomically.
export function rgxAtomic(tokens: RGXToken = []): RGXGroupToken {
    return new RGXGroupToken({ capturing: false, atomic: true }, tokens);
}