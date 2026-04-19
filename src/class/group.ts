import { RGXTokenCollection, RGXTokenCollectionInput } from "src/collection";
import { RGXClassToken } from "./base";
import { createConstructFunction, localizableVanillaRegexFlagDiff } from "src/internal";
import { createAssertRGXClassGuardFunction, createRegex, createRGXClassGuardFunction } from "src/utils";
import { assertValidIdentifier, assertValidRegexLocalizableFlags } from "src/typeGuards";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";

export type RGXGroupTokenArgs = {
    name?: string | null;
    capturing?: boolean;
    flags?: string;
};

export class RGXGroupToken extends RGXClassToken {
    tokens: RGXTokenCollection;
    _name: string | null = null;
    _flags: string = '';
    _capturing: boolean = true;

    static check = createRGXClassGuardFunction(RGXGroupToken);
    static assert = createAssertRGXClassGuardFunction(RGXGroupToken);

    get name() {
        return this._name;
    }

    set name(value: string | null) {
        if (value !== null) assertValidIdentifier(value);
        this._name = value;
    }

    get capturing() {
        // Any named group is automatically capturing
        return this.name !== null || this._capturing;
    }

    set capturing(value: boolean) {
        if (!value) this.name = null; // Non-capturing groups cannot have names
        this._capturing = value;
    }

    get flags() {
        return this._flags;
    }

    set flags(value: string) {
        assertValidRegexLocalizableFlags(value);
        this._flags = value;
    }

    get rgxIsGroup() {
        return true as const;
    }

    get rgxGroupWrap() {
        // When this token is resolved, it will wrap itself in a group, so we don't want the resolver to group wrap it again.
        return false as const;
    }

    constructor ({ name = null, capturing = true, flags = '' }: RGXGroupTokenArgs = {}, tokens: RGXTokenCollectionInput = []) {
        super();
        this.name = name;
        this.capturing = capturing;
        this.flags = flags;

        if (tokens instanceof RGXTokenCollection && tokens.mode === 'union') this.tokens = new RGXTokenCollection(tokens, 'concat');
        else this.tokens = new RGXTokenCollection(tokens, 'concat');
    }

    toRgx() {
        // The collection token doesn't group itself, so this is safe.
        let result: string = this.tokens.toRgx().source;

        const hasFlags = this.flags.length > 0;
        // This will return the flags that are not present in the flags variable, preceded by a "-" if there are any.
        const flagsNotPresent = localizableVanillaRegexFlagDiff("ims", this.flags);

        if (this.name !== null) {
            result = `(?<${this.name}>${result})`;
        } else if (!this.capturing) {
            if (!hasFlags) result = `(?:${result})`;
            else result = `(?${this.flags}${flagsNotPresent}:${result})`;
        } else {
            result = `(${result})`;
        }

        if ((this.name !== null || this.capturing) && hasFlags) result = `(?${this.flags}${flagsNotPresent}:${result})`;

        return createRegex(result);
    }

    clone(depth: CloneDepth="max") {
        if (depth === 0) return this;
        return new RGXGroupToken({ name: this.name, capturing: this._capturing, flags: this.flags }, this.tokens.clone(depthDecrement(depth, 1)));
    }
}

export const rgxGroup = createConstructFunction(RGXGroupToken);