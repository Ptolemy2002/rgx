import { RGXClassToken } from "./base";
import { RGXInsertionContext, RGXJSONClassToken, RGXJSONValue, RGXToken } from "src/types";
import { createRGXJSONClassToken, rgxJSONClassArgs } from "src/json";
import { CloneDepth } from "@ptolemy2002/immutability-utils";
import { getRGXConstantValue } from "src/internal/constantRegistry";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";

function parseConstantJSONArgs(args: RGXJSONValue[]): [string, boolean?] | string {
    if (args.length < 1 || args.length > 2) return "Expected between 1 and 2 arguments (name, cache).";
    const [name, cache] = args;
    if (typeof name !== "string") return "Argument 0 (name) must be a string.";
    if (cache !== undefined && typeof cache !== "boolean") return "Argument 1 (cache) must be a boolean, if present.";
    return [name, cache];
}

// A reference to a constant by name. The name is all it stores, so it survives JSON, and the constant is looked up
// when the token is used (or once, with caching on).
export class RGXConstantToken extends RGXClassToken {
    _name: string;
    _cache: boolean;
    _cached: RGXClassToken | null = null;

    static check = createRGXClassGuardFunction(RGXConstantToken);
    static assert = createAssertRGXClassGuardFunction(RGXConstantToken);

    get name() {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
        this.clearCache();
    }

    get cache() {
        return this._cache;
    }

    set cache(value: boolean) {
        this._cache = value;
        if (!value) this.clearCache();
    }

    constructor(name: string, cache: boolean = false) {
        super();
        this.name = name;
        this.cache = cache;
    }

    // The token registered under the name. With caching on, it's looked up the first time and kept.
    getConstant(): RGXClassToken {
        if (this._cached !== null) return this._cached;
        const value = getRGXConstantValue(this.name);
        if (this.cache) this._cached = value;
        return value;
    }

    clearCache() {
        this._cached = null;
    }

    get rgxIsRepeatable(): boolean | undefined {
        return this.getConstant().rgxIsRepeatable;
    }

    rgxAcceptInsertion(context: RGXInsertionContext): string | boolean {
        return this.getConstant().rgxAcceptInsertion(context);
    }

    toRgx(): RGXToken {
        return this.getConstant();
    }

    clone(depth: CloneDepth = "max") {
        if (depth === 0) return this;
        // The cached token is shared with the registry, so the clone looks it up again instead of copying it.
        return new RGXConstantToken(this.name, this.cache);
    }

    static fromJSON(json: RGXJSONClassToken): RGXConstantToken {
        const [name, cache] = rgxJSONClassArgs(json, "RGXConstantToken", parseConstantJSONArgs);
        return new RGXConstantToken(name, cache);
    }

    toJSON(): RGXJSONClassToken {
        return createRGXJSONClassToken("RGXConstantToken", [this.name, this.cache]);
    }
}
