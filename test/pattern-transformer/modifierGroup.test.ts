import { modifierGroupAlternativesPatternTransformer, modifierGroupLeaksPatternTransformer } from "src/index";

// Each case is [source, flags, input, whether the input should match], checked against the engine both before and
// after the fix, so these tests also show when an engine stops having the bug.
function expectFixed(fix: (source: string, flags: string) => string, source: string, flags: string, input: string, shouldMatch: boolean) {
    const fixed = fix(source, flags);
    expect(new RegExp(`^(?:${fixed})$`, flags).test(input)).toBe(shouldMatch);
    // Fixing the output again changes nothing.
    expect(fix(fixed, flags)).toBe(fixed);
    return fixed;
}

describe("modifierGroupAlternativesPatternTransformer", () => {
    it("gives each alternative of a case modifier group its own modifier group", () => {
        expect(new RegExp("^(?i:a|[b])$").test("B")).toBe(false);
        expect(expectFixed(modifierGroupAlternativesPatternTransformer, "(?i:a|[b])", "", "B", true)).toBe("(?:(?i:a)|(?i:[b]))");
        expectFixed(modifierGroupAlternativesPatternTransformer, "(?i:a|[^b])", "", "B", false);
        expectFixed(modifierGroupAlternativesPatternTransformer, "(?i:a|[b-d])", "", "C", true);
    });

    it("splits the group around inner disjunctions, keeping their groups and quantifiers", () => {
        expect(expectFixed(modifierGroupAlternativesPatternTransformer, "(?i:x(?:a|[b]))", "", "XB", true)).toBe("(?:(?i:x)(?:(?i:a)|(?i:[b])))");
        expect(expectFixed(modifierGroupAlternativesPatternTransformer, "(?i-m:a|(?<n>c|[d])*)", "", "DcD", true))
            .toBe("(?:(?i-m:a)|(?<n>(?i-m:c)|(?i-m:[d]))*)");
        expectFixed(modifierGroupAlternativesPatternTransformer, "(?i:x|y(?:a|[b]))+", "", "XyB", true);
        expectFixed(modifierGroupAlternativesPatternTransformer, "(?i:(?=a|[b]).)", "", "B", true);
    });

    it("combines the modifiers of nested modifier groups", () => {
        expect(expectFixed(modifierGroupAlternativesPatternTransformer, "(?i:a|(?-i:b|[c]))", "", "C", false)).toBe("(?:(?i:a)|(?:(?-i:b)|(?-i:[c])))");
        expect(expectFixed(modifierGroupAlternativesPatternTransformer, "(?i:a|(?s:b|[c]))", "", "C", true)).toBe("(?:(?i:a)|(?:(?is:b)|(?is:[c])))");
        expectFixed(modifierGroupAlternativesPatternTransformer, "(?i:[a]|(?i:[b]))", "", "B", true);
        expectFixed(modifierGroupAlternativesPatternTransformer, "(?-i:a|[b])", "i", "B", false);
    });

    it("rebuilds the groups around a misread modifier group", () => {
        expect(expectFixed(modifierGroupAlternativesPatternTransformer, "(?m:(?i:a|[b]))", "", "B", true)).toBe("(?m:(?:(?i:a)|(?i:[b])))");
        expectFixed(modifierGroupAlternativesPatternTransformer, "x|(y(?i:a|[b]))?", "", "yB", true);
        expect(modifierGroupAlternativesPatternTransformer("(?:c)(?i:a)(?i:a|[b])", "")).toBe("(?:c)(?i:a)(?:(?i:a)|(?i:[b]))");
    });

    it("leaves sources the engine reads correctly alone", () => {
        for (const source of ["(?:a|[b])", "(?i:[a]b)", "(?i:a|\\w)", "(?m:a|[b])", "(?i:)", "a)"]) {
            expect(modifierGroupAlternativesPatternTransformer(source, "")).toBe(source);
        }
        expect(modifierGroupAlternativesPatternTransformer("(?i:a|[b])", "u")).toBe("(?i:a|[b])");
        expect(modifierGroupAlternativesPatternTransformer("(?i:a|[b])", "v")).toBe("(?i:a|[b])");
    });
});

describe("modifierGroupLeaksPatternTransformer", () => {
    it("opens an empty group after case modifier groups", () => {
        expect(new RegExp("^(?i:a)[B]$", "v").test("ab")).toBe(true);
        expect(expectFixed(modifierGroupLeaksPatternTransformer, "(?i:a)[B]", "v", "ab", false)).toBe("(?i:a)(?:)[B]");
        expect(expectFixed(modifierGroupLeaksPatternTransformer, "(?i:a)+[B]", "v", "aab", false)).toBe("(?i:a)+(?:)[B]");
        expectFixed(modifierGroupLeaksPatternTransformer, "(?i:a)\\w", "u", "aK", false);
        expectFixed(modifierGroupLeaksPatternTransformer, "(?-i:a)[B]", "iv", "ab", true);
    });

    it("stops leaks across alternatives and out of enclosing groups", () => {
        expect(expectFixed(modifierGroupLeaksPatternTransformer, "(?:(?i:a)|c)[B]", "v", "ab", false)).toBe("(?:(?i:a)(?:)|c)[B]");
        expect(expectFixed(modifierGroupLeaksPatternTransformer, "(?i:a(?-i:b)[C])", "v", "abc", true)).toBe("(?i:a(?-i:b)(?:)[C])");
        expect(expectFixed(modifierGroupLeaksPatternTransformer, "(?i:a(?-i:b)[C])[D]", "v", "abcd", false)).toBe("(?i:a(?-i:b)(?:)[C])(?:)[D]");
    });

    it("leaves sources the engine reads correctly alone", () => {
        for (const source of ["(?i:a)", "(?i:a)(?:b)", "(?i:a)(?=b)", "(?i:a)(b)*", "(?m:a)[B]", "a)"]) {
            expect(modifierGroupLeaksPatternTransformer(source, "v")).toBe(source);
        }
        expect(modifierGroupLeaksPatternTransformer("(?i:a)[B]", "")).toBe("(?i:a)[B]");
    });
});
