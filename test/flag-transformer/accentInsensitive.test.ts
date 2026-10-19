import {
    accentInsensitiveFlagTransformer, getAccentInsensitiveSetExpansion, registerCustomFlagTransformers, setAccentInsensitiveSetExpansion,
    unregisterCustomFlagTransformers
} from "src/flag-transformer";
import { ExtRegExp } from "src/ExtRegExp";
import { accentBaseOf, accentVariantClass } from "src/internal";

// The combining marks allowed after each letter, with and without the u or v flag.
const marks = "[\\u0300-\\u036f]*";
const unicodeMarks = "\\p{M}*";
const letter = (base: string, after = marks) => accentVariantClass(base) + after;
// The letters with accented forms that \w matches, in the order the replacements list them.
const wordLetters = [..."ABCDEFGHIJKLMNOPRSTUVWXYZabcdefghijklmnoprstuvwxyz"];
const letters = (bases: string[], after = marks) => bases.map(base => letter(base, after)).join("|");
// The letters with accented forms that \w matches in both cases, each made case-insensitive. Case folding misses İ,
// and the Angstrom sign without the u flag, so they are added.
const caselessWordLetters = [..."abcdefghijklmnoprstuvwxyz"];
function caselessLetters(after = marks, modifier = true) {
    return caselessWordLetters.map(base => {
        const extra = base === "i" ? "İ" : base === "a" && after === marks ? "\u212b" : "";
        const variants = `${accentVariantClass(base).slice(0, -1)}${extra}]`;
        return (modifier ? `(?i:${variants})` : variants) + after;
    }).join("|");
}

function transform(source: string, flags = "") {
    return accentInsensitiveFlagTransformer(new ExtRegExp(source, flags))[0];
}

function transformed(source: string, flags = "") {
    return new RegExp(transform(source, flags), flags);
}

describe("accent variant data", () => {
    it("finds the precomposed variants of letters from their decompositions", () => {
        expect(accentVariantClass("e")).toMatch(/^\[eèéêë/);
        for (const variant of "ñçāőęů") expect(accentVariantClass(variant.normalize("NFD")[0]!)).toContain(variant);
        expect(accentBaseOf("Ő".codePointAt(0)!)).toBe("O");
        expect(accentBaseOf("e".codePointAt(0)!)).toBe("e");
    });

    it("leaves out characters that don't decompose into a letter and combining marks", () => {
        expect(accentBaseOf("æ".codePointAt(0)!)).toBeNull();
        expect(accentBaseOf("q".codePointAt(0)!)).toBeNull();
        expect(accentBaseOf("1".codePointAt(0)!)).toBeNull();
    });
});

describe("accentInsensitiveFlagTransformer", () => {
    it("preserves the original flags", () => {
        const regex = new ExtRegExp("tést", "gi");
        const transformed = accentInsensitiveFlagTransformer(regex);
        expect(transformed[1]).toBe(regex.flags);
    });

    it("leaves patterns without accentable characters unchanged", () => {
        expect(transform("1q_", "g")).toBe("1q_");
    });

    it("replaces each accentable character with its letter's class followed by combining marks", () => {
        expect(transform("té", "g")).toBe(letter("t") + letter("e"));
        expect(transform("TÉ", "g")).toBe(letter("T") + letter("E"));
    });

    it("uses property escapes for the combining marks with the u or v flag", () => {
        expect(transform("é", "u")).toBe(letter("e", unicodeMarks));
        expect(transform("é", "v")).toBe(letter("e", unicodeMarks));
    });

    it("replaces characters by value, so escapes are covered", () => {
        expect(transform("\\x61\\u00e9", "g")).toBe(letter("a") + letter("e"));
        expect(transform("\\u0025", "g")).toBe("\\u0025");
    });

    it("removes combining marks written after an accentable character", () => {
        expect(transform("é̂x", "u")).toBe(letter("e", unicodeMarks) + letter("x", unicodeMarks));
        // Marks that don't follow a replaced element are kept.
        expect(transform("́1́", "u")).toBe("́1́");
    });

    it("does not transform characters part of other syntax", () => {
        expect(transform("(?mi:1)", "g")).toBe("(?mi:1)");
        expect(transform("(?m-i:1)", "g")).toBe("(?m-i:1)");
        expect(transform("(?<value>1)\\k<value>", "g")).toBe("(?<value>1)\\k<value>");
        expect(transform("\\p{Script=Greek}", "gu")).toBe("\\p{Script=Greek}");
    });

    it("transforms quantified characters so the quantifier applies to the whole replacement", () => {
        expect(transform("ó+", "g")).toBe(`(?:${letter("o")})+`);
        expect(transformed("ó+").exec("xoóö")?.[0]).toBe("oóö");
    });

    it("transforms characters inside groups and lookarounds", () => {
        expect(transform("(?<n>a)(?<=u)", "g")).toBe(`(?<n>${letter("a")})(?<=${letter("u")})`);
    });

    it("splits character classes into the other characters and one alternative per letter", () => {
        expect(transform("[a-dx_]", "g")).toBe(`(?:${letters(["a", "b", "c", "d", "x"])}|[_])`);
        expect(transform("[à-é]", "g")).toBe(`(?:${letters(["a", "c", "e"])}|[\\u00e6])`);
        expect(transform("[ae]", "g")).toBe(`(?:${letter("a")}|${letter("e")})`);
    });

    it("splits ranges around the accentable characters they contain, writing their ends by value", () => {
        const source = transform("[\\u0000-\\u{10000}]", "u");
        expect(source).toContain("|[\\u0000-\\u0040Q\\u005b-\\u0060q\\u007b-");
        expect(source.endsWith("-\\u{10000}])")).toBe(true);
        expect(new RegExp(source, "u").test("\u{10000}")).toBe(true);
    });

    it("leaves character classes without accentable characters alone", () => {
        expect(transform("[0-9_]", "g")).toBe("[0-9_]");
        expect(transform("[\\d1a]", "g")).toBe(`(?:${letter("a")}|[\\d1])`);
    });

    it("adds the letters character sets in a class match, keeping the sets whole", () => {
        expect(transform("[\\w.]", "g")).toBe(`(?:${caselessLetters()}|[\\w.])`);
        // Negated sets are kept as they are.
        expect(transform("[\\W_]", "g")).toBe("[\\W_]");
        expect(transform("[^\\w]", "g")).toBe(`(?!${caselessLetters()})[^\\w]`);
    });

    it("expands character sets outside classes", () => {
        expect(transform("\\w", "g")).toBe(`(?:${caselessLetters()}|\\w)`);
        expect(transform("\\w+", "u")).toBe(`(?:${caselessLetters(unicodeMarks)}|\\w)+`);
        expect(transform("\\p{Lu}", "u")).toBe(`(?:${letters(wordLetters.slice(0, 25), unicodeMarks)}|\\p{Lu})`);
        expect(transform("\\d\\s.", "g")).toBe("\\d\\s.");

        const regex = transformed("^\\w+$", "u");
        for (const word of ["cafe", "café", "cafe\u0301"]) expect(regex.test(word)).toBe(true);
        expect(regex.test("caf!")).toBe(false);
    });

    it("makes letters a set matches in both cases case-insensitive", () => {
        // Sets matching one case keep their own letters.
        expect(transform("[a-z]", "g")).toBe(`(?:${letters(wordLetters.slice(25))}|[q])`);
        // The i flag already makes them case-insensitive.
        expect(transform("\\w", "gi")).toBe(`(?:${caselessLetters(marks, false)}|\\w)`);
        // With the v flag, V8 would make classes after a modifier group case-insensitive too, so cases are kept apart.
        expect(transform("\\w", "v")).toBe(`(?:${letters(wordLetters, unicodeMarks)}|\\w)`);
        expect(transformed("^\\w[B]$", "v").test("ab")).toBe(false);
        expect(transform("\\w", "iv")).toBe(`(?:${caselessLetters(unicodeMarks, false)}|\\w)`);

        for (const flags of ["", "u", "i"]) {
            const regex = transformed("^\\w+$", flags);
            // Each letter has its own modifier group, since V8 only makes the first class in an alternation inside
            // one case-insensitive without the u flag.
            for (const word of ["CAFÉ", "Ärger", "İSTANBUL", "\u212bngström", "E\u0301TE\u0301"]) expect(regex.test(word)).toBe(true);
            expect(transformed("^\\W$", flags).test("Ö")).toBe(false);
        }

        // Case folding adds a few characters the letters' variants don't include.
        expect(transformed("^\\w$", "u").test("ſ")).toBe(true);
        expect(transformed("^\\w$", "u").test("\u212a")).toBe(true);
        expect(transformed("^\\w$").test("ẛ")).toBe(true);
    });

    it("turns negated character sets into a negative lookahead for the letters of their positive form", () => {
        expect(transform("\\W", "g")).toBe(`(?!${caselessLetters()})\\W`);
        expect(transform("\\P{Lu}+", "u")).toBe(`(?:(?!${letters(wordLetters.slice(0, 25), unicodeMarks)})\\P{Lu})+`);
        expect(transform("\\D", "g")).toBe("\\D");

        const regex = transformed("^\\W$");
        expect(regex.test("é")).toBe(false);
        expect(regex.test("!")).toBe(true);
    });

    it("can have set expansion turned off", () => {
        expect(getAccentInsensitiveSetExpansion()).toBe(true);
        setAccentInsensitiveSetExpansion(false);
        try {
            expect(getAccentInsensitiveSetExpansion()).toBe(false);
            expect(transform("\\w\\W[\\w]", "u")).toBe("\\w\\W[\\w]");
            expect(transform("[\\wa]", "u")).toBe(`(?:${letter("a", unicodeMarks)}|[\\w])`);
        } finally {
            setAccentInsensitiveSetExpansion(true);
        }
    });

    it("turns negated character classes into a negative lookahead for their letters", () => {
        expect(transform("[^a-d]", "g")).toBe(`(?!${["a", "b", "c", "d"].map(base => letter(base)).join("|")})[^a-d]`);
        expect(transform("[^a]+", "g")).toBe(`(?:(?!${letter("a")})[^a])+`);

        const regex = transformed("^[^a-d]$");
        for (const character of ["á", "b", "ḃ"]) expect(regex.test(character)).toBe(false);
        expect(regex.test("x")).toBe(true);
    });

    it("wraps a replaced character class only once when it is quantified", () => {
        expect(transform("[a]{2}", "g")).toBe(`(?:${letter("a")}){2}`);
    });

    it("applies set operations and nested classes with the v flag before splitting", () => {
        const subtraction = transform("[[a-e]--[\\q{ou}b]]", "v");
        expect(subtraction).toBe(`(?:${letters(["a", "c", "d", "e"], unicodeMarks)}|[[[a-e]--[\\q{ou}b]]--[acde]])`);

        expect(transform("[[a]x]", "v")).toBe(`(?:${letters(["a", "x"], unicodeMarks)}|[[[a]x]--[ax]])`);
        expect(transform("[^[a]&&[a-b]]", "v")).toBe(`(?!${letter("a", unicodeMarks)})[^[a]&&[a-b]]`);

        // Without set operations or nested classes, the class is split the same way as without the v flag.
        expect(transform("[ab]", "v")).toBe(`(?:${letter("a", unicodeMarks)}|${letter("b", unicodeMarks)})`);
        expect(transform("[\\q{ou}1]", "v")).toBe("[\\q{ou}1]");
    });

    it("does not transform characters part of nested character classes on their own", () => {
        // Only the outermost class is replaced.
        expect(transform("[[1]]", "v")).toBe("[[1]]");
    });

    it("matches every accented and decomposed variant of the transformed characters", () => {
        const regex = transformed("^tést$", "u");
        for (const variant of ["test", "tést", "tèst", "tęst", "tést", "ţệst"]) expect(regex.test(variant)).toBe(true);
        expect(regex.test("tast")).toBe(false);

        const plain = transformed("^ñ$");
        expect(plain.test("ñ")).toBe(true);
        expect(plain.test("ń")).toBe(true);
    });

    it("works when applied as a flag", () => {
        registerCustomFlagTransformers(); // Ensure the "a" flag is registered
        const regex = new ExtRegExp("tést", "ga");
        expect(regex.source).toBe(letter("t") + letter("e") + letter("s") + letter("t"));
        unregisterCustomFlagTransformers(); // Clean up after the test
    });
});
