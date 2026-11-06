import { RGXInvalidPartAliasError, RGXInvalidPartError, RGXPartAliasConflictError } from "src/errors";
import { RGXPart } from "./part";

// Parts can't be serialized to JSON, since they hold functions. Registering a part under an alias lets tokens that
// configure themselves with parts store the alias instead, and look the part up again whenever they use it.
const partAliases = new Map<string, RGXPart<any, any, any>>();

// A part, or the alias of a registered one.
export type RGXPartReference<R = any, S = any, T = any> = RGXPart<R, S, T> | string;

export function hasRGXPartAlias(name: string): boolean {
    return partAliases.has(name);
}

export function assertHasRGXPartAlias(name: string) {
    if (!hasRGXPartAlias(name)) throw new RGXInvalidPartAliasError("Part alias not found.", name);
}

export function listRGXPartAliases(): string[] {
    return [...partAliases.keys()];
}

export function registerRGXPartAlias(name: string, part: RGXPart<any, any, any>) {
    if (name === "") throw new RGXInvalidPartAliasError("Part aliases can't be empty.", name);
    if (hasRGXPartAlias(name)) throw new RGXPartAliasConflictError("Part alias already registered.", name);
    if (!RGXPart.check(part)) throw new RGXInvalidPartError("Invalid Part", part, "RGXPart");
    partAliases.set(name, part);
    return part;
}

export function getRGXPartAlias<R = any, S = any, T = any>(name: string): RGXPart<R, S, T> {
    assertHasRGXPartAlias(name);
    return partAliases.get(name)!;
}

// Returns the part that was registered, so it can be registered again later.
export function unregisterRGXPartAlias(name: string): RGXPart<any, any, any> {
    const part = getRGXPartAlias(name);
    partAliases.delete(name);
    return part;
}

export function isRGXPartReference(value: unknown): value is RGXPartReference {
    return typeof value === "string" || RGXPart.check(value);
}

// The part a reference refers to: the part itself, or the one registered under the alias now.
export function resolveRGXPartReference<R = any, S = any, T = any>(reference: RGXPartReference<R, S, T>): RGXPart<R, S, T> {
    return typeof reference === "string" ? getRGXPartAlias<R, S, T>(reference) : reference;
}
