import { 
    ExtRegExp, registerFlagTransformer, RGXFlagTransformerConflictError,
    RGXInvalidFlagTransformerKeyError, RGXInvalidRegexFlagsError,
    unregisterFlagTransformer, isFlagKeyAvailable, applyFlagTransformers,
    extractCustomRegexFlags, extractVanillaRegexFlags, isValidRegexFlags,
    assertValidRegexFlags, RegExpFlagTransformer,
    RGXInvalidVanillaRegexFlagsError
} from "src/index";

describe("ExtRegExp", () => {
    it("acts like a normal RegExp", () => {
        const regex = new ExtRegExp("a(b*)c", "gi");
        const match = regex.exec("Abc abc aBBc");
        expect(match).not.toBeNull();
        expect(match![0]).toBe("Abc");
        expect(match![1]).toBe("b");
    });

    it("accepts normal regex flags", () => {
        const regex = new ExtRegExp("test", "gimsuy");
        expect(regex.flags).toBe("gimsuy");
    });

    it("accepts custom flags", () => {
        const customFlagTransformer: RegExpFlagTransformer = (exp: RegExp) => ["transformed", exp.flags];

        registerFlagTransformer("x", customFlagTransformer);

        const regex = new ExtRegExp("test", "gix");
        expect(regex.flags).toBe("gix");
        expect(regex.source).toBe("transformed");

        unregisterFlagTransformer("x");
    });

    it("keeps the source from before custom flag transformations", () => {
        registerFlagTransformer("x", exp => ["a" + exp.source, exp.flags]);
        try {
            expect(new ExtRegExp("b", "gx").originalSource).toBe("b");
            expect(new ExtRegExp(/b/g).originalSource).toBe("b");

            // Constructing from an ExtRegExp rebuilds it from the original source, so the new flags replace its
            // custom flags, and each one is applied once.
            const base = new ExtRegExp("b", "x");
            const withoutCustom = new ExtRegExp(base, "g");
            expect(withoutCustom.source).toBe("b");
            expect(withoutCustom.originalSource).toBe("b");
            expect(withoutCustom.flags).toBe("g");

            const withCustom = new ExtRegExp(base, "gx");
            expect(withCustom.source).toBe("ab");
            expect(withCustom.originalSource).toBe("b");
            expect(withCustom.flags).toBe("gx");
        } finally {
            unregisterFlagTransformer("x");
        }
    });

    it("preserves custom flags in derived regexes", () => {
        const customFlagTransformer: RegExpFlagTransformer = (exp: RegExp) => ["transformed", exp.flags];

        registerFlagTransformer("x", customFlagTransformer);

        const regex = new ExtRegExp("test", "x");
        // @ts-expect-error - TypeScript says it's not constructable, but it is at runtime
        const derivedRegex = new regex.constructor(regex.source, regex.flags);
        expect(derivedRegex.flags).toBe("x");
        expect(derivedRegex.source).toBe("transformed");

        unregisterFlagTransformer("x");
    });

    it("returns custom flags in .flags property", () => {
        const customFlagTransformer:RegExpFlagTransformer = (exp: RegExp) => [exp.source, exp.flags];
        registerFlagTransformer("x", customFlagTransformer);

        const regex = new ExtRegExp("test", "gx");
        expect(regex.flags).toBe("gx");

        unregisterFlagTransformer("x");
    });

    it("clones an existing RegExp's by source only", () => {
        const baseRegex = /a(b*)c/gi;
        const regex = new ExtRegExp(baseRegex);
        expect(regex.source).toBe(baseRegex.source);
    });

    it("has correct species", () => {
        expect(ExtRegExp[Symbol.species]).toBe(ExtRegExp);
    });
});

describe("isFlagKeyAvailable", () => {
    it("returns false for valid vanilla regex flags", () => {
        expect(isFlagKeyAvailable("g")).toBe(false);
        expect(isFlagKeyAvailable("i")).toBe(false);
        expect(isFlagKeyAvailable("m")).toBe(false);
        expect(isFlagKeyAvailable("s")).toBe(false);
        expect(isFlagKeyAvailable("u")).toBe(false);
        expect(isFlagKeyAvailable("y")).toBe(false);
    });

    it("returns false for keys that already have transformers", () => {
        const customFlagTransformer: RegExpFlagTransformer = (exp: RegExp) => [exp.source, exp.flags];
        registerFlagTransformer("x", customFlagTransformer);

        expect(isFlagKeyAvailable("x")).toBe(false);

        unregisterFlagTransformer("x");
    });

    it("returns true for available keys", () => {
        expect(isFlagKeyAvailable("z")).toBe(true);
    });
});

describe("registerFlagTransformer", () => {
    it("registers a valid transformer", () => {
        const customFlagTransformer: RegExpFlagTransformer = (exp: RegExp) => [exp.source, exp.flags];
        registerFlagTransformer("x", customFlagTransformer);
        expect(isFlagKeyAvailable("x")).toBe(false);
        unregisterFlagTransformer("x");
    });

    it("throws an error for invalid keys", () => {
        expect(() => registerFlagTransformer("xx", (exp) => [exp.source, exp.flags])).toThrow(RGXInvalidFlagTransformerKeyError);
        expect(() => registerFlagTransformer("g", (exp) => [exp.source, exp.flags])).toThrow(RGXFlagTransformerConflictError);
    });

    it("throws an error for duplicate keys", () => {
        const customFlagTransformer: RegExpFlagTransformer = (exp: RegExp) => [exp.source, exp.flags];
        registerFlagTransformer("x", customFlagTransformer);
        expect(() => registerFlagTransformer("x", customFlagTransformer)).toThrow(RGXFlagTransformerConflictError);
        unregisterFlagTransformer("x");
    });
});

describe("unregisterFlagTransformer", () => {
    it("unregisters an existing transformer", () => {
        const customFlagTransformer: RegExpFlagTransformer = (exp: RegExp) => [exp.source, exp.flags];
        registerFlagTransformer("x", customFlagTransformer);
        expect(isFlagKeyAvailable("x")).toBe(false);
        unregisterFlagTransformer("x");
        expect(isFlagKeyAvailable("x")).toBe(true);
    });

    it("does not throw an error for non-existent keys", () => {
        expect(() => unregisterFlagTransformer("nonexistent")).not.toThrow();
    });
});

describe("applyFlagTransformers", () => {
    it("converts RegExp subclass instances to plain RegExp instances", () => {
        const customFlagTransformer: RegExpFlagTransformer = (exp: RegExp) => ["transformed" + exp.source, exp.flags];

        registerFlagTransformer("x", customFlagTransformer);

        class CustomRegExp extends RegExp {}
        const transformedRegex = applyFlagTransformers(new CustomRegExp("test", "g"), "x");
        expect(Object.getPrototypeOf(transformedRegex)).toBe(RegExp.prototype);
        expect(transformedRegex.source).toBe("transformedtest");
        expect(transformedRegex.flags).toBe("g");

        unregisterFlagTransformer("x");
    });

    it("treats the custom flags of an ExtRegExp as already applied", () => {
        const customFlagTransformer: RegExpFlagTransformer = (exp: RegExp) => ["transformed" + exp.source, exp.flags];

        registerFlagTransformer("x", customFlagTransformer);

        const extRegex = new ExtRegExp("test", "gx");
        const transformedRegex = applyFlagTransformers(extRegex, "x");
        expect(Object.getPrototypeOf(transformedRegex)).toBe(RegExp.prototype);
        expect(transformedRegex.source).toBe("transformedtest");
        expect(transformedRegex.flags).toBe("g");

        unregisterFlagTransformer("x");
    });

    it("applies registered transformers to a regex", () => {
        const customFlagTransformer: RegExpFlagTransformer = (exp: RegExp) => ["transformed", exp.flags];

        registerFlagTransformer("x", customFlagTransformer);

        const regex = /test/;
        const transformedRegex = applyFlagTransformers(regex, "x");
        expect(transformedRegex.source).toBe("transformed");

        unregisterFlagTransformer("x");
    });

    it("Throws an RGXInvalidVanillaRegexFlagsError if a transformer produces invalid vanilla flags", () => {
        registerFlagTransformer("x", (r) => [r.source, "invalid"]);

        const regex = /test/;
        expect(() => applyFlagTransformers(regex, "x")).toThrow(RGXInvalidVanillaRegexFlagsError);
        
        unregisterFlagTransformer("x");
    });

    it("does not throw an error if a transformer is not found", () => {
        const regex = /test/;
        expect(() => applyFlagTransformers(regex, "x")).not.toThrow();
    });

    it("skips already applied transformers", () => {
        const customFlagTransformer: RegExpFlagTransformer = (exp: RegExp) => ["transformed" + exp.source, exp.flags];

        registerFlagTransformer("x", customFlagTransformer);

        const regex = /test/;
        const transformedRegex = applyFlagTransformers(regex, "x");
        const doubleTransformedRegex = applyFlagTransformers(transformedRegex, "x", "x");
        expect(doubleTransformedRegex.source).toBe("transformedtest");

        unregisterFlagTransformer("x");
    });
});

describe("extractCustomRegexFlags", () => {
    it("extracts custom flags from a flags string", () => {
        const customFlagTransformer: RegExpFlagTransformer = (exp: RegExp) => [exp.source, exp.flags];
        registerFlagTransformer("x", customFlagTransformer);
        registerFlagTransformer("z", customFlagTransformer);

        expect(extractCustomRegexFlags("gixz")).toBe("xz");

        unregisterFlagTransformer("x");
        unregisterFlagTransformer("z");
    });

    it("returns an empty string if no custom flags are present", () => {
        expect(extractCustomRegexFlags("gim")).toBe("");
    });
});

describe("extractVanillaRegexFlags", () => {
    it("extracts vanilla flags from a flags string", () => {
        const customFlagTransformer: RegExpFlagTransformer = (exp: RegExp) => [exp.source, exp.flags];
        registerFlagTransformer("x", customFlagTransformer);
        registerFlagTransformer("z", customFlagTransformer);

        expect(extractVanillaRegexFlags("gixz")).toBe("gi");

        unregisterFlagTransformer("x");
        unregisterFlagTransformer("z");
    });

    it("returns the original string if no custom flags are present", () => {
        expect(extractVanillaRegexFlags("gim")).toBe("gim");
        expect(extractVanillaRegexFlags("")).toBe("");
    });
});

describe("isValidRegexFlags", () => {
    it("returns true for valid vanilla regex flags", () => {
        expect(isValidRegexFlags("g")).toBe(true);
        expect(isValidRegexFlags("i")).toBe(true);
        expect(isValidRegexFlags("m")).toBe(true);
        expect(isValidRegexFlags("s")).toBe(true);
        expect(isValidRegexFlags("u")).toBe(true);
        expect(isValidRegexFlags("y")).toBe(true);

        expect(() => assertValidRegexFlags("g")).not.toThrow();
        expect(() => assertValidRegexFlags("i")).not.toThrow();
        expect(() => assertValidRegexFlags("m")).not.toThrow();
        expect(() => assertValidRegexFlags("s")).not.toThrow();
        expect(() => assertValidRegexFlags("u")).not.toThrow();
        expect(() => assertValidRegexFlags("y")).not.toThrow();
    });

    it("returns false for invalid flags", () => {
        expect(isValidRegexFlags("invalid")).toBe(false);
        expect(() => assertValidRegexFlags("invalid")).toThrow(RGXInvalidRegexFlagsError);
    });

    it("returns true for valid flags with custom flags included", () => {
        const customFlagTransformer: RegExpFlagTransformer = (exp: RegExp) => [exp.source, exp.flags];
        registerFlagTransformer("x", customFlagTransformer);

        expect(isValidRegexFlags("gix")).toBe(true);
        expect(() => assertValidRegexFlags("gix")).not.toThrow();

        unregisterFlagTransformer("x");
    });
});