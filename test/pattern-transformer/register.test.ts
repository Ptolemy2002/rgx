import rgx, {
    ExtRegExp, rgxa, rgxLexer, rgxw, rgxwa, RGXPatternTransformer, RGXInvalidRegexStringError,
    RGXPatternTransformerConflictError, RGXInvalidPatternTransformerKeyError,
    applyRGXPatternTransformers, applyRGXPatternTransformersToSource, hasRGXPatternTransformer, listRGXPatternTransformers,
    registerRGXPatternTransformer, unregisterRGXPatternTransformer,
    registerBuiltInRGXPatternTransformers, unregisterBuiltInRGXPatternTransformers,
} from "src/index";

const builtIns = ["modifier-group-alternatives", "modifier-group-leaks"];
const upperX: RGXPatternTransformer = source => source.replaceAll("x", "X");

afterEach(() => {
    for (const id of listRGXPatternTransformers()) unregisterRGXPatternTransformer(id);
    registerBuiltInRGXPatternTransformers();
});

describe("pattern transformer registry", () => {
    it("registers the built-in transformers", () => {
        expect(listRGXPatternTransformers()).toEqual(builtIns);
        expect(hasRGXPatternTransformer("modifier-group-leaks")).toBe(true);
        expect(hasRGXPatternTransformer("missing")).toBe(false);
    });

    it("registers and unregisters transformers in order", () => {
        registerRGXPatternTransformer("upper-x", upperX);
        expect(listRGXPatternTransformers()).toEqual([...builtIns, "upper-x"]);
        expect(unregisterRGXPatternTransformer("upper-x")).toBe(true);
        expect(unregisterRGXPatternTransformer("upper-x")).toBe(false);
        expect(hasRGXPatternTransformer("upper-x")).toBe(false);
    });

    it("rejects an id that is already registered", () => {
        expect(() => registerRGXPatternTransformer("modifier-group-leaks", upperX)).toThrow(RGXPatternTransformerConflictError);
    });

    it("unregisters the built-in transformers", () => {
        unregisterBuiltInRGXPatternTransformers();
        expect(listRGXPatternTransformers()).toEqual([]);
        expect(new ExtRegExp("(?i:a|[b])").source).toBe("(?i:a|[b])");
    });
});

describe("applyRGXPatternTransformersToSource", () => {
    it("applies every transformer by default", () => {
        expect(applyRGXPatternTransformersToSource("(?i:a|[b])")).toBe("(?:(?i:a)|(?i:[b]))");
        expect(applyRGXPatternTransformersToSource("(?i:a)[B]", "v")).toBe("(?i:a)(?:)[B]");
    });

    it("applies only the given transformers, in registration order", () => {
        registerRGXPatternTransformer("upper-x", upperX);
        registerRGXPatternTransformer("wrap", source => `(?:${source})`);
        expect(applyRGXPatternTransformersToSource("(?i:x|[b])", "", ["upper-x"])).toBe("(?i:X|[b])");
        expect(applyRGXPatternTransformersToSource("x", "", ["wrap", "upper-x"])).toBe("(?:X)");
        expect(applyRGXPatternTransformersToSource("x", "", [])).toBe("x");
    });

    it("throws for ids that aren't registered", () => {
        expect(() => applyRGXPatternTransformersToSource("x", "", ["missing"])).toThrow(RGXInvalidPatternTransformerKeyError);
    });

    it("throws when a transformer produces an invalid regex", () => {
        registerRGXPatternTransformer("broken", source => `${source}(`);
        expect(() => applyRGXPatternTransformersToSource("x")).toThrow(RGXInvalidRegexStringError);
        expect(() => rgxa(["x"])).toThrow(RGXInvalidRegexStringError);
    });
});

describe("applyRGXPatternTransformers", () => {
    it("returns a plain RegExp with the transformed source and the same flags", () => {
        const result = applyRGXPatternTransformers(new RegExp("(?i:a)[B]", "gv"));
        expect(Object.getPrototypeOf(result)).toBe(RegExp.prototype);
        expect(result.source).toBe("(?i:a)(?:)[B]");
        expect(result.flags).toBe("gv");
    });

    it("applies only the given transformers", () => {
        registerRGXPatternTransformer("upper-x", upperX);
        expect(applyRGXPatternTransformers(/(?i:x|[b])/, ["upper-x"]).source).toBe("(?i:X|[b])");
    });

    it("keeps only the vanilla flags of ExtRegExp instances", () => {
        const result = applyRGXPatternTransformers(new ExtRegExp("x", "iw"));
        expect(result.flags).toBe("i");
        expect(result.source).toBe("^(?:x)$");
    });
});

describe("finished patterns", () => {
    it("go through registered transformers", () => {
        registerRGXPatternTransformer("upper-x", upperX);
        expect(rgxa(["x"]).source).toBe("X");
        expect(rgxwa("X", ["x"]).walk()).toBeNull();
    });

    it("is applied to every finished pattern", () => {
        expect(rgxa([/^/, /[a]|[b]/i, /$/]).test("B")).toBe(true);
        expect(rgxa([/^/, /a/i, /[B]/, /$/], "v").test("ab")).toBe(false);
        expect(rgx("u")`${/^/}${/a/i}${/\w/}${/$/}`.test("aK")).toBe(false);
        expect(new ExtRegExp("^(?i:a|[b])$").test("B")).toBe(true);

        const walker = rgxwa("B", [/[a]|[b]/i]);
        walker.walk();
        expect(walker.lastCapture()?.raw).toBe("B");
        expect(rgxw("B")`${/[a]|[b]/i}`.capture(/[a]|[b]/i)).toBe("B");

        const lexer = rgxLexer("B", { default: [{ id: "letter", type: "resolve", token: /[a]|[b]/i }] }, 0, { resolveOnce: false });
        expect(lexer.consume()?.raw).toBe("B");
        const cached = rgxLexer("B", { default: [{ id: "letter", type: "resolve", token: /[a]|[b]/i }] });
        expect(cached.consume()?.raw).toBe("B");
    });
});
