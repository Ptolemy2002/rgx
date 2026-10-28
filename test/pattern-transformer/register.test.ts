import rgx, {
    ExtRegExp, rgxa, rgxLexer, rgxw, rgxwa, RGXPatternTransformer, RGXInvalidRegexStringError,
    RGXPatternTransformerConflictError, RGXInvalidPatternTransformerKeyError,
    applyRGXPatternTransformers, applyRGXPatternTransformersToSource, hasRGXPatternTransformer, listRGXPatternTransformers,
    registerRGXPatternTransformer, unregisterRGXPatternTransformer,
    registerBuiltInRGXPatternTransformers, unregisterBuiltInRGXPatternTransformers,
    isRGXPatternTransformerEnabled, setRGXPatternTransformerEnabled, regexWithFlags, rgxTokenToJSON, rgxTokenFromJSON,
    isRGXJSONLiteralToken,
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

describe("setRGXPatternTransformerEnabled", () => {
    it("turns individual transformers on and off for finished patterns", () => {
        expect(isRGXPatternTransformerEnabled("modifier-group-alternatives")).toBe(true);
        setRGXPatternTransformerEnabled("modifier-group-alternatives", false);
        expect(isRGXPatternTransformerEnabled("modifier-group-alternatives")).toBe(false);
        expect(listRGXPatternTransformers()).toEqual(builtIns);
        expect(listRGXPatternTransformers(true)).toEqual(["modifier-group-leaks"]);

        expect(rgxa(["x", /(?i:a|[b])/]).source).toBe("x(?i:a|[b])");
        expect(rgxa([/(?i:a)/, /[B]/], "v").source).toBe("(?i:a)(?:)[B]");
        expect(new ExtRegExp("(?i:a|[b])").patternTransformers).toEqual(["modifier-group-leaks"]);
        expect(new ExtRegExp("(?i:a|[b])", "", true).source).toBe("(?:(?i:a)|(?i:[b]))");
        expect(rgxwa("B", [/[a]|[b]/i]).tryWalk()).toBe(false);
        const lexer = rgxLexer("B", { default: [{ id: "letter", type: "resolve", token: /[a]|[b]/i }] });
        expect(() => lexer.consume()).toThrow();

        // Applying them explicitly still works.
        expect(applyRGXPatternTransformersToSource("(?i:a|[b])")).toBe("(?:(?i:a)|(?i:[b]))");
        expect(applyRGXPatternTransformers(/(?i:a|[b])/).source).toBe("(?:(?i:a)|(?i:[b]))");

        setRGXPatternTransformerEnabled("modifier-group-alternatives", true);
        expect(rgxa(["x", /(?i:a|[b])/]).source).toBe("x(?:(?i:a)|(?i:[b]))");
    });

    it("registers transformers disabled", () => {
        registerRGXPatternTransformer("upper-x", upperX, false);
        expect(isRGXPatternTransformerEnabled("upper-x")).toBe(false);
        expect(rgxa(["x"]).source).toBe("x");
        expect(new ExtRegExp("x", "", ["upper-x"]).source).toBe("X");
    });

    it("throws for ids that aren't registered", () => {
        expect(() => isRGXPatternTransformerEnabled("missing")).toThrow(RGXInvalidPatternTransformerKeyError);
        expect(() => setRGXPatternTransformerEnabled("missing", true)).toThrow(RGXInvalidPatternTransformerKeyError);
    });
});

describe("keeping an ExtRegExp's selection", () => {
    beforeEach(() => registerRGXPatternTransformer("upper-x", upperX, false));

    it("keeps it when the ExtRegExp is rebuilt", () => {
        const regex = new ExtRegExp("x|(?i:a|[b])", "", ["upper-x"]);
        expect(new ExtRegExp(regex, "g").patternTransformers).toEqual(["upper-x"]);
        expect(new ExtRegExp(regex, "g").source).toBe("X|(?i:a|[b])");
        expect(new ExtRegExp(regex, "g", null).patternTransformers).toEqual(["upper-x"]);
        expect(new ExtRegExp(regex, "g", true).patternTransformers).toEqual([...builtIns, "upper-x"]);
        expect(regexWithFlags(regex, "g").patternTransformers).toEqual(["upper-x"]);
        expect(regexWithFlags(regex, "i", true).source).toBe("X|(?i:a|[b])");

        unregisterRGXPatternTransformer("upper-x");
        expect(new ExtRegExp(regex).patternTransformers).toEqual([]);
    });

    it("keeps it through JSON when it isn't the default", () => {
        const regex = new ExtRegExp("x", "g", ["upper-x"]);
        const json = rgxTokenToJSON(regex);
        expect(json).toEqual({ $rgx: true, source: "x", flags: "g", patternTransformers: ["upper-x"] });
        const restored = rgxTokenFromJSON(json) as ExtRegExp;
        expect(restored.patternTransformers).toEqual(["upper-x"]);
        expect(restored.source).toBe("X");

        expect(rgxTokenToJSON(new ExtRegExp("x"))).toEqual({ $rgx: true, source: "x" });
        expect(rgxTokenToJSON(new ExtRegExp("x", "", ["modifier-group-leaks"]))).toEqual({ $rgx: true, source: "x", patternTransformers: ["modifier-group-leaks"] });
        expect((rgxTokenFromJSON({ $rgx: true, source: "x" }) as ExtRegExp).patternTransformers).toEqual(builtIns);
        expect((rgxTokenFromJSON({ $rgx: true, source: "x", patternTransformers: ["upper-x", "missing"] }) as ExtRegExp).patternTransformers).toEqual(["upper-x"]);
    });

    it("checks the stored selection's type", () => {
        expect(isRGXJSONLiteralToken({ $rgx: true, source: "x", patternTransformers: ["a"] })).toBe(true);
        expect(isRGXJSONLiteralToken({ $rgx: true, source: "x", patternTransformers: undefined })).toBe(true);
        expect(isRGXJSONLiteralToken({ $rgx: true, source: "x", patternTransformers: "a" })).toBe(false);
        expect(isRGXJSONLiteralToken({ $rgx: true, source: "x", patternTransformers: [1] })).toBe(false);
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
