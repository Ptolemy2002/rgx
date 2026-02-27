import { RGXTokenCollection, RGXTokenCollectionInput } from "src/collection";
import { RGXClassToken } from "./base";
import { createAssertClassGuardFunction, createClassGuardFunction, createConstructFunction } from "src/internal";
import { assertValidIdentifier } from "src/typeGuards";
import { CloneDepth, depthDecrement } from "@ptolemy2002/immutability-utils";

export type RGXGroupTokenArgs = {
    name?: string | null;
    capturing?: boolean;
};

export class RGXGroupToken extends RGXClassToken {
    tokens: RGXTokenCollection;
    _name: string | null = null;
    _capturing: boolean = true;

    static check = createClassGuardFunction(RGXGroupToken);
    static assert = createAssertClassGuardFunction(RGXGroupToken);

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

    get rgxIsGroup() {
        return true as const;
    }

    get rgxGroupWrap() {
        // When this token is resolved, it will wrap itself in a group, so we don't want the resolver to group wrap it again.
        return false as const;
    }

    constructor ({ name = null, capturing = true }: RGXGroupTokenArgs = {}, tokens: RGXTokenCollectionInput = []) {
        super();
        this.name = name;
        this.capturing = capturing;

        if (tokens instanceof RGXTokenCollection && tokens.mode === 'union') this.tokens = new RGXTokenCollection(tokens, 'concat');
        else this.tokens = new RGXTokenCollection(tokens, 'concat');
    }

    toRgx() {
        // The collection token doesn't group itself, so this is safe.
        let result: string = this.tokens.toRgx().source;

        if (this.name !== null) result = `(?<${this.name}>${result})`;
        else if (!this.capturing) result = `(?:${result})`;
        else result = `(${result})`;

        return new RegExp(result);
    }

    clone(depth: CloneDepth="max") {
        if (depth === 0) return this;
        return new RGXGroupToken({ name: this.name, capturing: this._capturing }, this.tokens.clone(depthDecrement(depth, 1)));
    }
}

export const rgxGroup = createConstructFunction(RGXGroupToken);