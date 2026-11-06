import {
    assertHasRGXPartAlias, getRGXPartAlias, hasRGXPartAlias, isRGXPartReference, listRGXPartAliases, registerRGXPartAlias,
    resolveRGXPartReference, rgxPart, unregisterRGXPartAlias
} from "src/walker";
import { RGXInvalidPartAliasError, RGXInvalidPartError, RGXPartAliasConflictError } from "src/errors";

describe("part aliases", () => {
    afterEach(() => {
        for (const name of listRGXPartAliases()) unregisterRGXPartAlias(name);
    });

    it("registers, finds, lists and unregisters parts", () => {
        const part = rgxPart(/\d+/, { transform: Number });
        expect(registerRGXPartAlias("number", part)).toBe(part);
        expect(hasRGXPartAlias("number")).toBe(true);
        expect(() => assertHasRGXPartAlias("number")).not.toThrow();
        expect(getRGXPartAlias("number")).toBe(part);
        expect(listRGXPartAliases()).toEqual(["number"]);

        expect(unregisterRGXPartAlias("number")).toBe(part);
        expect(hasRGXPartAlias("number")).toBe(false);
        expect(listRGXPartAliases()).toEqual([]);
    });

    it("rejects aliases that are taken or empty, and values that aren't parts", () => {
        registerRGXPartAlias("number", rgxPart(/\d+/));
        expect(() => registerRGXPartAlias("number", rgxPart(/\d/))).toThrow(RGXPartAliasConflictError);
        expect(() => registerRGXPartAlias("", rgxPart(/\d/))).toThrow(RGXInvalidPartAliasError);
        expect(() => registerRGXPartAlias("other", /\d/ as never)).toThrow(RGXInvalidPartError);
        expect(hasRGXPartAlias("other")).toBe(false);
    });

    it("throws for aliases that aren't registered", () => {
        expect(() => assertHasRGXPartAlias("missing")).toThrow(RGXInvalidPartAliasError);
        expect(() => getRGXPartAlias("missing")).toThrow(RGXInvalidPartAliasError);
        expect(() => unregisterRGXPartAlias("missing")).toThrow(RGXInvalidPartAliasError);
    });

    it("recognizes and resolves references", () => {
        const part = rgxPart(/\d+/);
        registerRGXPartAlias("number", part);
        expect(isRGXPartReference("number")).toBe(true);
        expect(isRGXPartReference(part)).toBe(true);
        expect(isRGXPartReference(5)).toBe(false);
        expect(resolveRGXPartReference(part)).toBe(part);
        expect(resolveRGXPartReference("number")).toBe(part);
        expect(() => resolveRGXPartReference("missing")).toThrow(RGXInvalidPartAliasError);
    });

    it("looks the alias up each time, so registering it again changes what it refers to", () => {
        registerRGXPartAlias("number", rgxPart(/\d+/));
        unregisterRGXPartAlias("number");
        const replacement = rgxPart(/[0-9]+/);
        registerRGXPartAlias("number", replacement);
        expect(resolveRGXPartReference("number")).toBe(replacement);
    });
});
