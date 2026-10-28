import rgx, {
    ExtRegExp, rgxa, rgxLexer, rgxw, rgxwa, RGXPatternTransformer, RGXInvalidRegexStringError,
    RGXPatternTransformerConflictError, RGXInvalidPatternTransformerKeyError,
    applyRGXPatternTransformers, applyRGXPatternTransformersToSource, hasRGXPatternTransformer, listRGXPatternTransformers,
    registerRGXPatternTransformer, unregisterRGXPatternTransformer,
    registerBuiltInRGXPatternTransformers, unregisterBuiltInRGXPatternTransformers,
    getRGXPatternTransformersEnabled, setRGXPatternTransformersEnabled,
} from "src/index";

const builtIns = ["modifier-group-alternatives", "modifier-group-leaks"];
const upperX: RGXPatternTransformer = source => source.replaceAll("x", "X");

afterEach(() => {
    setRGXPatternTransformersEnabled(true);
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

    it("rebuilds ExtRegExp instances with the transformers added to the ones they had", () => {
        registerRGXPatternTransformer("upper-x", upperX);
        const regex = new ExtRegExp("x|(?i:a|[b])", "w", ["modifier-group-alternatives"]);
        expect(regex.source).toBe("^(?:x|(?:(?i:a)|(?i:[b])))$");

        const result = applyRGXPatternTransformers(regex, ["upper-x"]);
        expect(result).toBeInstanceOf(ExtRegExp);
        expect(result.flags).toBe("w");
        expect(result.originalSource).toBe("x|(?i:a|[b])");
        expect(result.patternTransformers).toEqual(["modifier-group-alternatives", "upper-x"]);
        expect(result.source).toBe("^(?:X|(?:(?i:a)|(?i:[b])))$");

        expect(applyRGXPatternTransformers(new ExtRegExp("x", "", false)).patternTransformers).toEqual([...builtIns, "upper-x"]);
        expect(() => applyRGXPatternTransformers(regex, ["missing"])).toThrow(RGXInvalidPatternTransformerKeyError);
    });

    it("leaves out transformers an ExtRegExp had that are no longer registered", () => {
        registerRGXPatternTransformer("upper-x", upperX);
        const regex = new ExtRegExp("x", "", ["upper-x"]);
        unregisterRGXPatternTransformer("upper-x");
        expect(applyRGXPatternTransformers(regex, []).patternTransformers).toEqual([]);
        expect(applyRGXPatternTransformers(regex, []).source).toBe("x");
    });
});

describe("ExtRegExp pattern transformers", () => {
    it("applies every registered transformer by default", () => {
        const regex = new ExtRegExp("(?i:a|[b])");
        expect(regex.patternTransformers).toEqual(builtIns);
        expect(regex.source).toBe("(?:(?i:a)|(?i:[b]))");
    });

    it("applies the selected transformers", () => {
        expect(new ExtRegExp("(?i:a|[b])", "", false).source).toBe("(?i:a|[b])");
        expect(new ExtRegExp("(?i:a|[b])", "", false).patternTransformers).toEqual([]);
        expect(new ExtRegExp("(?i:a|[b])", "", true).patternTransformers).toEqual(builtIns);
        expect(new ExtRegExp("(?i:a)[B]", "v", ["modifier-group-leaks"]).source).toBe("(?i:a)(?:)[B]");
        expect(() => new ExtRegExp("x", "", ["missing"])).toThrow(RGXInvalidPatternTransformerKeyError);
    });
});

describe("setRGXPatternTransformersEnabled", () => {
    it("turns the default transformers of finished patterns on and off", () => {
        expect(getRGXPatternTransformersEnabled()).toBe(true);
        setRGXPatternTransformersEnabled(false);
        expect(getRGXPatternTransformersEnabled()).toBe(false);

        expect(rgxa(["x", /(?i:a|[b])/]).source).toBe("x(?i:a|[b])");
        expect(new ExtRegExp("(?i:a|[b])").patternTransformers).toEqual([]);
        expect(new ExtRegExp("(?i:a|[b])", "", true).source).toBe("(?:(?i:a)|(?i:[b]))");
        expect(rgxwa("B", [/[a]|[b]/i]).tryWalk()).toBe(false);
        const lexer = rgxLexer("B", { default: [{ id: "letter", type: "resolve", token: /[a]|[b]/i }] });
        expect(() => lexer.consume()).toThrow();

        // Applying them explicitly still works.
        expect(applyRGXPatternTransformersToSource("(?i:a|[b])")).toBe("(?:(?i:a)|(?i:[b]))");
        expect(applyRGXPatternTransformers(/(?i:a|[b])/).source).toBe("(?:(?i:a)|(?i:[b]))");

        setRGXPatternTransformersEnabled(true);
        expect(rgxa(["x", /(?i:a|[b])/]).source).toBe("x(?:(?i:a)|(?i:[b]))");
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
