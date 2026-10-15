import { rgxa, rgxParse, RGXClassUnionToken, RGXClassWrapperToken, RGXGroupToken, RGXLookaheadToken, RGXLookbehindToken, RGXRepeatToken, RGXSubpatternToken, RGXTokenCollection, RGXInvalidRegexStringError, RGXInvalidVanillaRegexFlagsError, RGXNotSupportedError, isRGXInterpolationToken } from "src/index";

function expectSameMatches(original: RegExp, texts: string[]) {
    const parsed = rgxa([rgxParse(original)], original.flags);
    for (const text of texts) {
        original.lastIndex = 0;
        parsed.lastIndex = 0;
        expect(parsed.exec(text)).toEqual(original.exec(text));
    }
}

describe("rgxParse", () => {
    describe("structure", () => {
        it("converts capturing and named groups into group tokens", () => {
            const result = rgxParse(/(a)/);
            expect(result).toBeInstanceOf(RGXGroupToken);
            expect((result as RGXGroupToken).capturing).toBe(true);
            expect((result as RGXGroupToken).name).toBeNull();
            expect((result as RGXGroupToken).tokens.toArray()).toEqual(["a"]);

            const named = rgxParse(/(?<word>ab)/) as RGXGroupToken;
            expect(named.name).toBe("word");
            expect(named.tokens.toArray()).toEqual(["ab"]);
        });

        it("converts quantifiers into repeat tokens", () => {
            const cases: [RegExp, number, number | null, boolean][] = [
                [/a*/, 0, null, false],
                [/a+?/, 1, null, true],
                [/a??/, 0, 1, true],
                [/a{2,5}/, 2, 5, false],
                [/a{3}/, 3, 3, false],
                [/a{2,}?/, 2, null, true]
            ];

            for (const [regex, min, max, lazy] of cases) {
                const result = rgxParse(regex) as RGXRepeatToken;
                expect(result).toBeInstanceOf(RGXRepeatToken);
                expect([result.token, result.min, result.max, result.lazy]).toEqual(["a", min, max, lazy]);
            }
        });

        it("converts alternatives into union tokens", () => {
            const result = rgxParse(/ab|c|/) as RGXClassUnionToken;
            expect(result).toBeInstanceOf(RGXClassUnionToken);
            expect(result.tokens.toArray()).toEqual(["ab", "c", null]);
        });

        it("keeps sequences inside alternatives together", () => {
            const result = rgxParse(/a(b)|c/) as RGXClassUnionToken;
            const first = result.tokens.at(0) as RGXTokenCollection;
            expect(first).toBeInstanceOf(RGXTokenCollection);
            expect(first.mode).toBe("concat");
            expect(first.toArray()[0]).toBe("a");
            expect(first.toArray()[1]).toBeInstanceOf(RGXGroupToken);
        });

        it("converts lookarounds into lookaround tokens", () => {
            const cases: [RegExp, typeof RGXLookaheadToken | typeof RGXLookbehindToken, boolean][] = [
                [/(?=a)/, RGXLookaheadToken, true],
                [/(?!a)/, RGXLookaheadToken, false],
                [/(?<=a)/, RGXLookbehindToken, true],
                [/(?<!a)/, RGXLookbehindToken, false]
            ];

            for (const [regex, Class, positive] of cases) {
                const result = rgxParse(regex);
                expect(result).toBeInstanceOf(Class);
                expect((result as RGXLookaheadToken).positive).toBe(positive);
                expect((result as RGXLookaheadToken).tokens.toArray()).toEqual(["a"]);
            }
        });

        it("puts lookarounds and groups with several alternatives around a union", () => {
            const result = rgxParse(/(?=a|b)/) as RGXLookaheadToken;
            expect(result.tokens.at(0)).toBeInstanceOf(RGXClassUnionToken);
        });

        it("converts backreferences into subpattern tokens", () => {
            const result = rgxParse(/(?<n>a)\1\k<n>/) as RGXGroupToken;
            const [, numbered, named] = result.tokens.toArray() as [unknown, RGXSubpatternToken, RGXSubpatternToken];
            expect(numbered).toBeInstanceOf(RGXSubpatternToken);
            expect(numbered.pattern).toBe(1);
            expect(named.pattern).toBe("n");
        });

        it("removes non-capturing groups without flags, keeping their structure in the tokens", () => {
            const result = rgxParse(/(?:ab)+/) as RGXRepeatToken;
            expect(result).toBeInstanceOf(RGXRepeatToken);
            expect(result.token).toBe("ab");

            const union = rgxParse(/(?:a|b)/);
            expect(union).toBeInstanceOf(RGXClassUnionToken);
        });

        it("converts other elements into literal tokens", () => {
            for (const regex of [/[a-z]/, /\d/, /./, /^/, /\b/, /\p{L}/u, new RegExp("[\\p{L}--[a-z]]", "v")]) {
                const result = rgxParse(regex) as RGXClassWrapperToken;
                expect(result).toBeInstanceOf(RGXClassWrapperToken);
                expect(result.token).toBeInstanceOf(RegExp);
                expect((result.token as RegExp).source).toBe(regex.source);
            }
        });

        it("wraps the result in a class token", () => {
            const string = rgxParse(/abc/) as RGXClassWrapperToken;
            expect(string).toBeInstanceOf(RGXClassWrapperToken);
            expect(string.token).toBe("abc");

            // A sequence becomes a non-capturing group, the same as toRGXClassToken does with a concatenation.
            const sequence = rgxParse(/a\d/) as RGXGroupToken;
            expect(sequence).toBeInstanceOf(RGXGroupToken);
            expect(sequence.capturing).toBe(false);
            expect(sequence.tokens.toArray()[0]).toBe("a");

            const empty = rgxParse(/(?:)/) as RGXClassWrapperToken;
            expect(empty.token).toBeNull();
        });
    });

    describe("flags", () => {
        it("wraps patterns with localizable flags in a group that sets them", () => {
            const result = rgxParse(/a$/gm) as RGXGroupToken;
            expect(result).toBeInstanceOf(RGXGroupToken);
            expect(result.capturing).toBe(false);
            expect(result.flags).toBe("m");
        });

        it("converts flag-modifier groups into groups with the flags in effect inside them", () => {
            const result = rgxParse(/(?i:a)/m) as RGXGroupToken;
            const inner = result.tokens.at(0) as RGXGroupToken;
            expect(inner).toBeInstanceOf(RGXGroupToken);
            expect(inner.capturing).toBe(false);
            expect(inner.flags).toBe("im");
        });

        it("keeps the delimiters of groups that turn off every flag in effect as interpolations", () => {
            const result = rgxParse(/(?-i:a)/i) as RGXGroupToken;
            const inner = (result.tokens.at(0) as RGXTokenCollection).toArray();
            expect(isRGXInterpolationToken(inner[0])).toBe(true);
            expect(inner[1]).toBe("a");
            expect(isRGXInterpolationToken(inner[2])).toBe(true);
            expectSameMatches(/(?-i:a)b/i, ["ab", "AB", "aB", "Ab"]);
        });

        it("drops groups that turn off flags that aren't in effect", () => {
            const result = rgxParse(/(?-i:a)/) as RGXClassWrapperToken;
            expect(result.token).toBe("a");
        });

        it("gives literal tokens the flags in effect that affect them", () => {
            const flagsOf = (regex: RegExp) => ((rgxParse(regex) as RGXGroupToken).tokens.at(0) as RegExp).flags;
            expect(flagsOf(/[a-z]/ims)).toBe("i");
            expect(flagsOf(/\w/ims)).toBe("i");
            expect(flagsOf(/\p{L}/imsu)).toBe("iu");
            expect(flagsOf(new RegExp("[\\p{L}--[a-z]]", "imsv"))).toBe("iv");
            expect(flagsOf(/\b/ims)).toBe("i");
            expect(flagsOf(/./ims)).toBe("s");
            expect(flagsOf(/^/ims)).toBe("m");
            expect(flagsOf(/\d/ims)).toBe("");
            expect(flagsOf(/\s/ims)).toBe("");
        });

        it("keeps characters affected by the i flag as literal tokens when it is in effect", () => {
            expect((rgxParse(/12/i) as RGXGroupToken).tokens.at(0)).toBe("12");

            const letters = (rgxParse(/a\.b/i) as RGXGroupToken).tokens.at(0) as RegExp;
            expect(letters).toBeInstanceOf(RegExp);
            expect(letters.flags).toBe("i");
            expect(letters.test("A.B")).toBe(true);

            const unicode = (rgxParse(/é😀/iu) as RGXGroupToken).tokens.at(0) as RegExp;
            expect(unicode.flags).toBe("iu");
            expect(unicode.test("É😀")).toBe(true);
        });

        it("escapes characters by value in literal tokens, so they read the same anywhere", () => {
            // Without groups, "\1" is an octal escape for the character with code 1.
            const result = (rgxParse(new RegExp("\\1a", "i")) as RGXGroupToken).tokens.at(0) as RegExp;
            expect(result.source).toBe("\\u0001a");
        });

        it("keeps characters that can't be escaped as strings with the u or v flag as literal tokens", () => {
            const result = rgxParse(/a-b/u) as RGXClassWrapperToken;
            expect(result.token).toBeInstanceOf(RegExp);
            expect((result.token as RegExp).source).toBe("a\\u{2d}b");
            expect(rgxParse(/a-b/).resolve()).toBe("a\\-b");
        });

        it("matches the same as the original when used with the same flags", () => {
            const texts = ["", "a", "A", "ab", "AB", "a\nb", "A\nB", "aaa", "x-y", "é", "É"];
            for (const regex of [/a+b?/, /(a)|b\1/i, /^b$/m, /a.b/s, /(?i:a)b/, /(?<n>a)(?-i:b)/i, /\w-\w/u, /é/iu, /(?=a)*a/, /(?:^)+a/m]) {
                expectSameMatches(regex, texts);
            }
        });

        it("matches the same as the original when placed in a pattern with other localizable flags, if the original had some", () => {
            const original = /a(b)\1$/im;
            const parsed = rgxa([rgxParse(original)], "s");
            for (const text of ["abb", "ABB", "aBb", "abb\nx", "ab"]) {
                expect(parsed.exec(text)).toEqual(original.exec(text));
            }
        });
    });

    describe("quantified assertions", () => {
        it("keeps quantifiers on assertions as interpolations around the assertion", () => {
            // The sequence of interpolations and the element becomes a non-capturing group, like any other sequence.
            const result = rgxParse(/(?=a)*/) as RGXGroupToken;
            expect(result).toBeInstanceOf(RGXGroupToken);
            const [open, element, close] = result.tokens.toArray();
            expect(open).toEqual({ rgxInterpolation: "(?:" });
            expect(element).toBeInstanceOf(RGXLookaheadToken);
            expect(close).toEqual({ rgxInterpolation: ")*" });
        });
    });

    describe("input", () => {
        it("accepts a source string with flags", () => {
            const result = rgxParse("a$", "m") as RGXGroupToken;
            expect(result.flags).toBe("m");
            expect((rgxParse("ab") as RGXClassWrapperToken).token).toBe("ab");
        });

        it("uses the given flags instead of the regex's own", () => {
            expect(rgxParse(/a$/m, "")).toBeInstanceOf(RGXGroupToken);
            expect((rgxParse(/a$/m, "") as RGXGroupToken).flags).toBe("");
        });

        it("throws for invalid sources and flags", () => {
            expect(() => rgxParse("(a")).toThrow(RGXInvalidRegexStringError);
            expect(() => rgxParse("a", "q")).toThrow(RGXInvalidVanillaRegexFlagsError);
        });

        it("doesn't support custom flags", () => {
            expect(() => rgxParse("a", "a")).toThrow(RGXNotSupportedError);
        });
    });
});
