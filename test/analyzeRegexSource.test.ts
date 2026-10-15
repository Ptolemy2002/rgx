import { isNonConsumingRegexSource, isSingletonRegexSource, parseRegexSource, removeRedundantRegexGroups, toSingletonRegexSource } from "src/internal/analyzeRegexSource";

describe("parseRegexSource", () => {
    it("parses valid sources", () => {
        const ast = parseRegexSource("a(b)|c");
        expect(ast?.type).toBe("Pattern");
        expect(ast?.alternatives).toHaveLength(2);
    });

    it("returns null for sources that are not valid regexes", () => {
        expect(parseRegexSource("(a")).toBeNull();
        expect(parseRegexSource("a)")).toBeNull();
        expect(parseRegexSource("*")).toBeNull();
    });

    it("reads the source according to the flags", () => {
        // "\\p{L}" is a property escape with the u or v flag, and a "p" repeated with a literal "{L}" without them.
        expect(parseRegexSource("\\p{L}")?.alternatives[0]!.elements).toHaveLength(4);
        expect(parseRegexSource("\\p{L}", { unicode: true })?.alternatives[0]!.elements).toHaveLength(1);
        expect(parseRegexSource("[\\p{L}--[a-z]]", { unicodeSets: true })?.alternatives[0]!.elements[0]!.type).toBe("ExpressionCharacterClass");
        expect(parseRegexSource("[\\p{L}--[a-z]]", { unicode: true })).toBeNull();
    });

    it("caches results by source and flags", () => {
        expect(parseRegexSource("(?:cached)")).toBe(parseRegexSource("(?:cached)"));
        expect(parseRegexSource("(?:cached)")).not.toBe(parseRegexSource("(?:cached)", { unicode: true }));
    });

    it("keeps working once the cache fills up", () => {
        for (let i = 0; i < 1100; i++) parseRegexSource(`fill${i}`);
        expect(parseRegexSource("fill1099")?.raw).toBe("fill1099");
        expect(parseRegexSource("fill0")?.raw).toBe("fill0");
    });
});

describe("isSingletonRegexSource", () => {
    it("accepts single characters, escapes, character classes, and groups", () => {
        for (const source of ["a", ".", "\\d", "\\u0041", "[a-z]", "[^\\]]", "(ab)", "(?:a|b)", "(?<name>a)", "(?i:a)"]) {
            expect(isSingletonRegexSource(source)).toBe(true);
        }
    });

    it("rejects sources with more than one top-level unit", () => {
        for (const source of ["", "ab", "a+", "a|b", "(a)(b)", "(a)+", "[a]b"]) {
            expect(isSingletonRegexSource(source)).toBe(false);
        }
    });

    it("rejects sources with paren errors", () => {
        expect(isSingletonRegexSource("(a")).toBe(false);
        expect(isSingletonRegexSource(")")).toBe(false);
    });

    it("rejects units that can't take a quantifier", () => {
        for (const source of ["^", "$", "|", "*", "{", "]", "\\b", "\\B", "(?=a)", "(?!a)", "(?<=a)", "(?<!a)"]) {
            expect(isSingletonRegexSource(source)).toBe(false);
        }
    });

    it("rejects groups that only contain assertions", () => {
        for (const source of ["(?:^)", "(?:(?=a))", "(^)", "(?:^|$)"]) {
            expect(isSingletonRegexSource(source)).toBe(false);
        }

        expect(isSingletonRegexSource("(?:)")).toBe(true);
    });
});

describe("isNonConsumingRegexSource", () => {
    it("accepts sources made entirely of assertions", () => {
        for (const source of ["^", "$", "\\b", "\\B", "(?=a)", "(?!a+)", "(?<=a)", "(?<!a)", "^$", "(?:^)", "(^)", "(?<=\\W|^)(?=\\w)", "^|$", "^|", "(?:)^", "(?!)"]) {
            expect(isNonConsumingRegexSource(source)).toBe(true);
        }
    });

    it("rejects sources that might consume characters", () => {
        for (const source of ["", "(?:)", "()", "a", "a?", "^a", "^|a", "(?:^a)", "^*", "\\d", "[^]", "(?=a)b"]) {
            expect(isNonConsumingRegexSource(source)).toBe(false);
        }
    });

    it("rejects sources with paren errors", () => {
        expect(isNonConsumingRegexSource("(?=a")).toBe(false);
        expect(isNonConsumingRegexSource("^)")).toBe(false);
        expect(isNonConsumingRegexSource("(?:^")).toBe(false);
    });
});

describe("toSingletonRegexSource", () => {
    it("leaves singletons that are not non-capturing groups alone", () => {
        expect(toSingletonRegexSource("a")).toBe("a");
        expect(toSingletonRegexSource("(a)")).toBe("(a)");
        expect(toSingletonRegexSource("(?i:a)")).toBe("(?i:a)");
    });

    it("wraps sources that are not singletons", () => {
        expect(toSingletonRegexSource("ab")).toBe("(?:ab)");
        expect(toSingletonRegexSource("^")).toBe("(?:^)");
    });

    it("removes non-capturing groups that only wrap a singleton", () => {
        expect(toSingletonRegexSource("(?:a)")).toBe("a");
        expect(toSingletonRegexSource("(?:(?:[a]))")).toBe("[a]");
        expect(toSingletonRegexSource("(?:(a))")).toBe("(a)");
    });

    it("keeps groups around escapes that depend on context", () => {
        expect(toSingletonRegexSource("(?:\\c)")).toBe("(?:\\c)");
        expect(toSingletonRegexSource("\\c")).toBe("(?:\\c)");
    });

    it("keeps non-capturing groups that wrap a non-singleton", () => {
        expect(toSingletonRegexSource("(?:ab)")).toBe("(?:ab)");
        expect(toSingletonRegexSource("(?:(?:ab))")).toBe("(?:ab)");
    });
});

describe("removeRedundantRegexGroups", () => {
    it("never removes capturing, named, flag-modifier, or lookaround groups", () => {
        for (const source of ["x(a)y", "x(?<n>a)y", "x(?i:a)y", "x(?=a)y", "x(?!a)y", "x(?<=a)y", "x(?<!a)y"]) {
            expect(removeRedundantRegexGroups(source)).toBe(source);
        }
    });

    it("removes groups whose contents can stand on their own", () => {
        expect(removeRedundantRegexGroups("x(?:ab)y")).toBe("xaby");
        expect(removeRedundantRegexGroups("x(?:a)*?y")).toBe("xa*?y");
        expect(removeRedundantRegexGroups("x(?:(?:a))y")).toBe("xay");
        expect(removeRedundantRegexGroups("(a(?:b)c)")).toBe("(abc)");
    });

    it("keeps groups whose contents a following quantifier must apply to as a whole", () => {
        expect(removeRedundantRegexGroups("x(?:ab)*y")).toBe("x(?:ab)*y");
        expect(removeRedundantRegexGroups("x(?:a(?:b))+y")).toBe("x(?:ab)+y");
    });

    it("only removes groups containing alternatives when they make up a whole alternative", () => {
        expect(removeRedundantRegexGroups("x(?:a|b)y")).toBe("x(?:a|b)y");
        expect(removeRedundantRegexGroups("(?<n>(?:a|b))")).toBe("(?<n>a|b)");
        expect(removeRedundantRegexGroups("x(?:c|(?:a|b)|d)y")).toBe("x(?:c|a|b|d)y");
    });

    it("keeps empty groups", () => {
        expect(removeRedundantRegexGroups("x(?:)y")).toBe("x(?:)y");
    });

    it("keeps groups whose removal would make the source invalid", () => {
        // "{2}" with nothing before it has nothing to repeat.
        expect(removeRedundantRegexGroups("(?:{)2}", { isolated: true })).toBe("(?:{)2}");
    });

    it("keeps groups that separate units that would merge", () => {
        for (const source of ["(a)(?:\\1)0", "(a)\\1(?:0)", "\\x4(?:1)", "\\c(?:a)", "a{(?:2})", "a{2(?:,)3}", "a(?:{2})"]) {
            expect(removeRedundantRegexGroups(source)).toBe(source);
        }
    });

    it("only removes groups at the edges when unknown text next to them can't change how they are read", () => {
        expect(removeRedundantRegexGroups("(?:ab)")).toBe("(?:ab)");
        expect(removeRedundantRegexGroups("(?:a)")).toBe("(?:a)");
        expect(removeRedundantRegexGroups("(?:a|b)")).toBe("(?:a|b)");
        expect(removeRedundantRegexGroups("(?:\\d)")).toBe("(?:\\d)");
        expect(removeRedundantRegexGroups("(?:[a])")).toBe("[a]");
        expect(removeRedundantRegexGroups("(?:\\d)x")).toBe("\\dx");
    });

    it("removes groups at the edges when the source is isolated", () => {
        expect(removeRedundantRegexGroups("(?:ab)", { isolated: true })).toBe("ab");
        expect(removeRedundantRegexGroups("(?:a|b)", { isolated: true })).toBe("a|b");
        expect(removeRedundantRegexGroups("(?:\\d)(?:x)", { isolated: true })).toBe("\\dx");
    });

    it("leaves sources with paren errors unchanged", () => {
        expect(removeRedundantRegexGroups("(?:a")).toBe("(?:a");
        expect(removeRedundantRegexGroups("x(?:a))")).toBe("x(?:a))");
    });

    it("reads unicode escapes according to the flags", () => {
        // Without the u flag, "\\u{41}" is "u" repeated 41 times, so the group can still be removed when nothing follows it.
        expect(removeRedundantRegexGroups("x(?:\\u{41})y")).toBe("x\\u{41}y");
        expect(removeRedundantRegexGroups("x(?:\\u{41})*", { unicode: true })).toBe("x\\u{41}*");
        expect(removeRedundantRegexGroups("x(?:\\u{41})*")).toBe("x(?:\\u{41})*");
    });
});

describe("context-dependent escapes", () => {
    it("treats multi-digit decimal escapes as non-singletons, since their meaning depends on the whole pattern", () => {
        expect(isSingletonRegexSource("\\1")).toBe(true);
        expect(isSingletonRegexSource("\\12")).toBe(false);
        expect(toSingletonRegexSource("\\12")).toBe("(?:\\12)");
    });

    it("treats lone braces and brackets as non-singletons", () => {
        for (const source of ["{", "}", "]"]) {
            expect(isSingletonRegexSource(source)).toBe(false);
        }
    });
});
