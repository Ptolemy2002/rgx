import rgx, { ExtRegExp, rgxa, rgxLexer, rgxw, rgxwa } from "src/index";
import { applyRGXPatternTransformers } from "src/internal/patternTransformers";
import { fixModifierGroupAlternatives, fixModifierGroupLeaks } from "src/internal/modifierGroupWorkarounds";

// Each case is [source, flags, input, whether the input should match], checked against the engine both before and
// after the fix, so these tests also show when an engine stops having the bug.
function expectFixed(fix: (source: string, flags: string) => string, source: string, flags: string, input: string, shouldMatch: boolean) {
    const fixed = fix(source, flags);
    expect(new RegExp(`^(?:${fixed})$`, flags).test(input)).toBe(shouldMatch);
    // Fixing the output again changes nothing.
    expect(fix(fixed, flags)).toBe(fixed);
    return fixed;
}

describe("fixModifierGroupAlternatives", () => {
    it("gives each alternative of a case modifier group its own modifier group", () => {
        expect(new RegExp("^(?i:a|[b])$").test("B")).toBe(false);
        expect(expectFixed(fixModifierGroupAlternatives, "(?i:a|[b])", "", "B", true)).toBe("(?:(?i:a)|(?i:[b]))");
        expectFixed(fixModifierGroupAlternatives, "(?i:a|[^b])", "", "B", false);
        expectFixed(fixModifierGroupAlternatives, "(?i:a|[b-d])", "", "C", true);
    });

    it("splits the group around inner disjunctions, keeping their groups and quantifiers", () => {
        expect(expectFixed(fixModifierGroupAlternatives, "(?i:x(?:a|[b]))", "", "XB", true)).toBe("(?:(?i:x)(?:(?i:a)|(?i:[b])))");
        expect(expectFixed(fixModifierGroupAlternatives, "(?i-m:a|(?<n>c|[d])*)", "", "DcD", true))
            .toBe("(?:(?i-m:a)|(?<n>(?i-m:c)|(?i-m:[d]))*)");
        expectFixed(fixModifierGroupAlternatives, "(?i:x|y(?:a|[b]))+", "", "XyB", true);
        expectFixed(fixModifierGroupAlternatives, "(?i:(?=a|[b]).)", "", "B", true);
    });

    it("combines the modifiers of nested modifier groups", () => {
        expect(expectFixed(fixModifierGroupAlternatives, "(?i:a|(?-i:b|[c]))", "", "C", false)).toBe("(?:(?i:a)|(?:(?-i:b)|(?-i:[c])))");
        expect(expectFixed(fixModifierGroupAlternatives, "(?i:a|(?s:b|[c]))", "", "C", true)).toBe("(?:(?i:a)|(?:(?is:b)|(?is:[c])))");
        expectFixed(fixModifierGroupAlternatives, "(?i:[a]|(?i:[b]))", "", "B", true);
        expectFixed(fixModifierGroupAlternatives, "(?-i:a|[b])", "i", "B", false);
    });

    it("rebuilds the groups around a misread modifier group", () => {
        expect(expectFixed(fixModifierGroupAlternatives, "(?m:(?i:a|[b]))", "", "B", true)).toBe("(?m:(?:(?i:a)|(?i:[b])))");
        expectFixed(fixModifierGroupAlternatives, "x|(y(?i:a|[b]))?", "", "yB", true);
        expect(fixModifierGroupAlternatives("(?:c)(?i:a)(?i:a|[b])", "")).toBe("(?:c)(?i:a)(?:(?i:a)|(?i:[b]))");
    });

    it("leaves sources the engine reads correctly alone", () => {
        for (const source of ["(?:a|[b])", "(?i:[a]b)", "(?i:a|\\w)", "(?m:a|[b])", "(?i:)", "a)"]) {
            expect(fixModifierGroupAlternatives(source, "")).toBe(source);
        }
        expect(fixModifierGroupAlternatives("(?i:a|[b])", "u")).toBe("(?i:a|[b])");
        expect(fixModifierGroupAlternatives("(?i:a|[b])", "v")).toBe("(?i:a|[b])");
    });
});

describe("fixModifierGroupLeaks", () => {
    it("opens an empty group after case modifier groups", () => {
        expect(new RegExp("^(?i:a)[B]$", "v").test("ab")).toBe(true);
        expect(expectFixed(fixModifierGroupLeaks, "(?i:a)[B]", "v", "ab", false)).toBe("(?i:a)(?:)[B]");
        expect(expectFixed(fixModifierGroupLeaks, "(?i:a)+[B]", "v", "aab", false)).toBe("(?i:a)+(?:)[B]");
        expectFixed(fixModifierGroupLeaks, "(?i:a)\\w", "u", "aK", false);
        expectFixed(fixModifierGroupLeaks, "(?-i:a)[B]", "iv", "ab", true);
    });

    it("stops leaks across alternatives and out of enclosing groups", () => {
        expect(expectFixed(fixModifierGroupLeaks, "(?:(?i:a)|c)[B]", "v", "ab", false)).toBe("(?:(?i:a)(?:)|c)[B]");
        expect(expectFixed(fixModifierGroupLeaks, "(?i:a(?-i:b)[C])", "v", "abc", true)).toBe("(?i:a(?-i:b)(?:)[C])");
        expect(expectFixed(fixModifierGroupLeaks, "(?i:a(?-i:b)[C])[D]", "v", "abcd", false)).toBe("(?i:a(?-i:b)(?:)[C])(?:)[D]");
    });

    it("leaves sources the engine reads correctly alone", () => {
        for (const source of ["(?i:a)", "(?i:a)(?:b)", "(?i:a)(?=b)", "(?i:a)(b)*", "(?m:a)[B]", "a)"]) {
            expect(fixModifierGroupLeaks(source, "v")).toBe(source);
        }
        expect(fixModifierGroupLeaks("(?i:a)[B]", "")).toBe("(?i:a)[B]");
    });
});

describe("applyRGXPatternTransformers", () => {
    it("applies every transformer", () => {
        expect(applyRGXPatternTransformers("(?i:a|[b])")).toBe("(?:(?i:a)|(?i:[b]))");
        expect(applyRGXPatternTransformers("(?i:a)[B]", "v")).toBe("(?i:a)(?:)[B]");
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
