import { hasRegexParenErrors, isSingletonRegexSource, removeRedundantRegexGroups, scanOptionsFromFlags, scanRegexSource, toSingletonRegexSource, tokenizeRegexSource, regexSourceUnitText } from "src/internal/scanRegexSource";

describe("scanRegexSource", () => {
    it("counts top-level units", () => {
        expect(scanRegexSource("")).toEqual({ depth: 0, unmatchedClose: false, topLevelUnits: 0 });
        expect(scanRegexSource("a")).toEqual({ depth: 0, unmatchedClose: false, topLevelUnits: 1 });
        expect(scanRegexSource("a+")).toEqual({ depth: 0, unmatchedClose: false, topLevelUnits: 2 });
        expect(scanRegexSource("(a|b)[c]\\d")).toEqual({ depth: 0, unmatchedClose: false, topLevelUnits: 3 });
    });

    it("tracks unterminated groups and unmatched closing parentheses", () => {
        expect(scanRegexSource("((a)")).toEqual({ depth: 1, unmatchedClose: false, topLevelUnits: 1 });
        expect(scanRegexSource("a)b")).toEqual({ depth: 0, unmatchedClose: true, topLevelUnits: 3 });
    });

    it("ignores parentheses in escapes and character classes", () => {
        expect(scanRegexSource("\\(a[()\\]]")).toEqual({ depth: 0, unmatchedClose: false, topLevelUnits: 3 });
    });

    it("only nests character classes with the v flag", () => {
        expect(scanRegexSource("[[a]]").topLevelUnits).toBe(2);
        expect(scanRegexSource("[[a]]", { unicodeSets: true }).topLevelUnits).toBe(1);
    });

    it("reads multi-character escapes as one unit", () => {
        expect(scanRegexSource("\\u0041").topLevelUnits).toBe(1);
        expect(scanRegexSource("\\x41").topLevelUnits).toBe(1);
        expect(scanRegexSource("\\cJ").topLevelUnits).toBe(1);
    });

    it("only reads unicode escapes as one unit with the u or v flag", () => {
        for (const escape of ["\\u{1F600}", "\\p{L}", "\\P{Script=Greek}", "\\k<name>"]) {
            expect(scanRegexSource(escape).topLevelUnits).toBeGreaterThan(1);
            expect(scanRegexSource(escape, { unicode: true }).topLevelUnits).toBe(1);
            expect(scanRegexSource(escape, { unicodeSets: true }).topLevelUnits).toBe(1);
        }
    });

    it("counts escapes whose meaning depends on context as two units", () => {
        // Without a control letter, "\\c" is a literal backslash followed by "c".
        expect(scanRegexSource("\\c").topLevelUnits).toBe(2);
        expect(scanRegexSource("\\cJ").topLevelUnits).toBe(1);
        // "\\12" is a backreference or an octal escape depending on how many groups there are.
        expect(scanRegexSource("\\12").topLevelUnits).toBe(2);
        expect(scanRegexSource("\\1").topLevelUnits).toBe(1);
    });

    it("falls back to two-character escapes when a multi-character escape is malformed", () => {
        expect(scanRegexSource("\\u00G1").topLevelUnits).toBe(5);
        expect(scanRegexSource("\\u{G}", { unicode: true }).topLevelUnits).toBe(4);
    });
});

describe("tokenizeRegexSource", () => {
    it("reads quantifiers, including lazy ones, as single units", () => {
        expect(tokenizeRegexSource("a*?b{2,3}?c{,2}").units.map(regexSourceUnitText)).toEqual(["a", "*?", "b", "{2,3}?", "c", "{", ",", "2", "}"]);
    });

    it("keeps unterminated groups and trailing backslashes as written", () => {
        const { units } = tokenizeRegexSource("a\\");
        expect(units.map(regexSourceUnitText)).toEqual(["a", "\\"]);
        expect(tokenizeRegexSource("(?:a").units.map(regexSourceUnitText)).toEqual(["(?:a"]);
    });

    it("reads group prefixes", () => {
        const prefixes = tokenizeRegexSource("(a)(?:a)(?<n>a)(?i-m:a)(?=a)(?<!a)").units.map(unit => unit.kind === 'group' && unit.prefix);
        expect(prefixes).toEqual(["(", "(?:", "(?<n>", "(?i-m:", "(?=", "(?<!"]);
    });
});

describe("scanOptionsFromFlags", () => {
    it("reads the u and v flags", () => {
        expect(scanOptionsFromFlags("gi")).toEqual({ unicode: false, unicodeSets: false });
        expect(scanOptionsFromFlags("u")).toEqual({ unicode: true, unicodeSets: false });
        expect(scanOptionsFromFlags("v")).toEqual({ unicode: true, unicodeSets: true });
    });
});

describe("hasRegexParenErrors", () => {
    it("detects unterminated groups and unmatched closing parentheses", () => {
        expect(hasRegexParenErrors("(a")).toBe(true);
        expect(hasRegexParenErrors("a)")).toBe(true);
        expect(hasRegexParenErrors("(a)")).toBe(false);
    });

    it("treats '[' inside a character class as a literal without the v flag", () => {
        expect(hasRegexParenErrors("[[](a")).toBe(true);
        expect(hasRegexParenErrors("[[](a", { unicodeSets: true })).toBe(false);
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
