import {
    assertHasRGXPartAlias, getRGXPartAlias, hasRGXPartAlias, isRGXPartReference, listRGXPartAliases, registerRGXPartAlias,
    resolveRGXPartReference, rgxPart, rgxPartAlias, RGXPart, unregisterRGXPartAlias
} from "src/walker";
import { RGXInvalidPartAliasError, RGXInvalidPartError, RGXNotSupportedError, RGXPartAliasConflictError } from "src/errors";
import { rgxwa } from "src/index";

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

    describe("alias parts", () => {
        it("behave like the registered part", () => {
            const validate = jest.fn(() => true);
            const part = rgxPart(/\d+/, { id: "n", transform: Number, rawTransform: raw => raw.trim(), validate });
            registerRGXPartAlias("number", part);

            const alias = rgxPartAlias("number");
            expect(alias).toBeInstanceOf(RGXPart);
            expect(alias.alias).toBe("number");
            expect(alias.target()).toBe(part);
            expect(part.target()).toBe(part);
            expect(part.alias).toBeNull();
            expect(alias.id).toBe("n");
            expect(alias.hasId()).toBe(true);
            expect(alias.token).toBe(part.token);
            expect(alias.isDynamic()).toBe(false);
            expect(alias.transform).toBe(part.transform);
            expect(alias.rawTransform).toBe(part.rawTransform);
            for (const key of ["beforeCapture", "afterCapture", "afterFailure", "afterValidationFailure", "afterLoss"] as const) {
                expect(alias[key]).toBeNull();
            }
        });

        it("can be walker steps, including in unions", () => {
            registerRGXPartAlias("number", rgxPart(/\d+/, { id: "n", transform: Number }));
            registerRGXPartAlias("word", rgxPart(/[a-z]+/, { id: "w" }));
            const walker = rgxwa<null>("12,ab", [rgxPartAlias("number"), ",", [rgxPartAlias("number"), rgxPartAlias("word")]]);
            walker.walk();
            expect(walker.namedCaptures.n![0]!.value).toBe(12);
            expect(walker.lastCapture()!.branch).toBe(1);
            expect(walker.lastCapture("w")!.raw).toBe("ab");
        });

        it("look the part up each time they are used", () => {
            registerRGXPartAlias("number", rgxPart(/\d+/));
            const alias = rgxPartAlias("number");
            unregisterRGXPartAlias("number");
            expect(() => alias.token).toThrow(RGXInvalidPartAliasError);
            registerRGXPartAlias("number", rgxPart(/x/, { id: "x" }));
            expect(alias.id).toBe("x");
        });

        it("work with dynamic parts and validation", () => {
            registerRGXPartAlias("dynamic", rgxPart<null>(({ part }) => part.id === "d" ? /a/ : /b/, { id: "d", validate: c => c.raw === "a" || "not a" }));
            const walker = rgxwa<null>("a", [rgxPartAlias("dynamic")]);
            expect(rgxPartAlias("dynamic").isDynamic()).toBe(true);
            walker.walk();
            expect(walker.lastCapture()!.raw).toBe("a");
        });

        it("can refer to other aliases, but not back to themselves", () => {
            const part = rgxPart(/\d/);
            registerRGXPartAlias("a", part);
            registerRGXPartAlias("b", rgxPartAlias("a"));
            expect(rgxPartAlias("b").target()).toBe(part);
            expect(() => registerRGXPartAlias("c", rgxPartAlias("c"))).toThrow(RGXPartAliasConflictError);
            registerRGXPartAlias("d", rgxPartAlias("e"));
            expect(() => registerRGXPartAlias("e", rgxPartAlias("d"))).toThrow(RGXPartAliasConflictError);
        });

        it("can't have their properties set", () => {
            const alias = rgxPartAlias("number");
            expect(() => { alias.id = "x"; }).toThrow(RGXNotSupportedError);
            expect(() => { alias.token = "x"; }).toThrow(RGXNotSupportedError);
            const part = rgxPart("a");
            part.id = "x";
            part.token = "b";
            expect(part.id).toBe("x");
            expect(part.token).toBe("b");
        });

        it("are cloned as aliases", () => {
            const alias = rgxPartAlias("number");
            const clone = alias.clone();
            expect(clone).not.toBe(alias);
            expect(clone.alias).toBe("number");
            expect(alias.clone(0)).toBe(alias);
        });
    });
});
