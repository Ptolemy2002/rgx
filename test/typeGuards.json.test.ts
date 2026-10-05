import {
    isRGXJSONValue, assertRGXJSONValue, isRGXJSONNativeToken, assertRGXJSONNativeToken,
    isRGXJSONLiteralToken, assertRGXJSONLiteralToken, isRGXJSONClassToken, assertRGXJSONClassToken,
    isRGXJSONObjectToken, assertRGXJSONObjectToken, isRGXJSONToken, assertRGXJSONToken,
    isRGXToken, assertRGXToken, isRGXArrayToken, isRGXConvertibleToken, isRGXGroupedToken, assertRGXGroupedToken,
    rgxTokenType, rgxTokenTypeFlat, rgxTokenTypeGuardInputToFlat,
    RGXInvalidJSONTokenError, RGXInvalidTokenError, RGXSubpatternToken, RGXLookaheadToken, RGXGroupToken,
    registerFlagTransformer, unregisterFlagTransformer
} from "src/index";

const literalJSON = { $rgx: true as const, source: "abc", flags: "i" };
const classJSON = { $rgx: true as const, class: "RGXSubpatternToken", args: [1] };
const lookaheadJSON = { $rgx: true as const, class: "RGXLookaheadToken", args: [["a"]] };
const groupJSON = { $rgx: true as const, class: "RGXGroupToken", args: [{}, ["a"]] };
const wrapperJSON = { $rgx: true as const, class: "RGXClassWrapperToken", args: ["a"] };

describe("isRGXJSONValue", () => {
    it("accepts JSON values", () => {
        for (const value of [null, "a", 1, true, [], [1, "a", [null]], {}, { a: 1, b: { c: [true] } }, { a: undefined }]) {
            expect(isRGXJSONValue(value)).toBe(true);
            expect(() => assertRGXJSONValue(value)).not.toThrow();
        }
    });

    it("rejects non-JSON values", () => {
        class Foo {}
        for (const value of [undefined, NaN, Infinity, () => {}, Symbol("x"), 1n, new Foo(), /a/, new Date(), [undefined], { a: () => {} }]) {
            expect(isRGXJSONValue(value)).toBe(false);
            expect(() => assertRGXJSONValue(value)).toThrow(RGXInvalidJSONTokenError);
        }
    });

    it("accepts null-prototype objects", () => {
        expect(isRGXJSONValue(Object.create(null))).toBe(true);
    });
});

describe("isRGXJSONNativeToken", () => {
    it("accepts JSON native tokens", () => {
        for (const value of [null, "a", 1, true, false]) {
            expect(isRGXJSONNativeToken(value)).toBe(true);
            expect(() => assertRGXJSONNativeToken(value)).not.toThrow();
        }
    });

    it("rejects other values", () => {
        for (const value of [undefined, NaN, {}, [], /a/]) {
            expect(isRGXJSONNativeToken(value)).toBe(false);
            expect(() => assertRGXJSONNativeToken(value)).toThrow(RGXInvalidJSONTokenError);
        }
    });
});

describe("isRGXJSONLiteralToken", () => {
    it("accepts valid literal tokens", () => {
        expect(isRGXJSONLiteralToken({ $rgx: true, source: "abc" })).toBe(true);
        expect(isRGXJSONLiteralToken(literalJSON)).toBe(true);
        expect(isRGXJSONLiteralToken({ $rgx: true, source: "abc", flags: undefined })).toBe(true);
        expect(() => assertRGXJSONLiteralToken(literalJSON)).not.toThrow();
    });

    it("rejects structurally invalid values", () => {
        for (const value of [
            null, "abc", { source: "abc" }, { $rgx: false, source: "abc" }, { $rgx: true }, { $rgx: true, source: 1 },
            { $rgx: true, source: "abc", class: "X" }, { $rgx: true, source: "abc", flags: 1 }, [literalJSON], new RGXSubpatternToken(1)
        ]) {
            expect(isRGXJSONLiteralToken(value)).toBe(false);
            expect(isRGXJSONLiteralToken(value, false)).toBe(false);
            expect(() => assertRGXJSONLiteralToken(value)).toThrow(RGXInvalidJSONTokenError);
        }
    });

    it("rejects invalid sources and flags only when contentCheck is true", () => {
        const badSource = { $rgx: true, source: "[" };
        const badFlags = { $rgx: true, source: "a", flags: "zz" };
        expect(isRGXJSONLiteralToken(badSource)).toBe(false);
        expect(isRGXJSONLiteralToken(badFlags)).toBe(false);
        expect(isRGXJSONLiteralToken(badSource, false)).toBe(true);
        expect(isRGXJSONLiteralToken(badFlags, false)).toBe(true);
    });

    it("accepts custom flags", () => {
        registerFlagTransformer("q", exp => [exp.source, exp.flags]);
        try {
            expect(isRGXJSONLiteralToken({ $rgx: true, source: "a", flags: "qi" })).toBe(true);
        } finally {
            unregisterFlagTransformer("q");
        }
    });
});

describe("isRGXJSONClassToken", () => {
    it("accepts valid class tokens", () => {
        expect(isRGXJSONClassToken(classJSON)).toBe(true);
        expect(isRGXJSONClassToken({ $rgx: true, class: "RGXGroupToken" })).toBe(true);
        expect(isRGXJSONClassToken({ $rgx: true, class: "RGXGroupToken", args: undefined })).toBe(true);
        expect(() => assertRGXJSONClassToken(classJSON)).not.toThrow();
    });

    it("rejects structurally invalid values", () => {
        for (const value of [
            null, "abc", { class: "X" }, { $rgx: true }, { $rgx: true, class: 1 }, { $rgx: true, class: "X", source: "a" },
            { $rgx: true, class: "X", args: "a" }, { $rgx: true, class: "X", args: [undefined] }, { $rgx: true, class: "X", args: [() => {}] }
        ]) {
            expect(isRGXJSONClassToken(value)).toBe(false);
            expect(isRGXJSONClassToken(value, false)).toBe(false);
            expect(() => assertRGXJSONClassToken(value)).toThrow(RGXInvalidJSONTokenError);
        }
    });

    it("checks the registry only when registryCheck is true", () => {
        const unregistered = { $rgx: true, class: "Nope" };
        const badArgs = { $rgx: true, class: "RGXSubpatternToken", args: [] };
        expect(isRGXJSONClassToken(unregistered)).toBe(false);
        expect(isRGXJSONClassToken(badArgs)).toBe(false);
        expect(isRGXJSONClassToken(unregistered, false)).toBe(true);
        expect(isRGXJSONClassToken(badArgs, false)).toBe(true);
    });
});

describe("isRGXJSONObjectToken", () => {
    it("accepts literal and class tokens", () => {
        expect(isRGXJSONObjectToken(literalJSON)).toBe(true);
        expect(isRGXJSONObjectToken(classJSON)).toBe(true);
        expect(() => assertRGXJSONObjectToken(literalJSON)).not.toThrow();
    });

    it("rejects other values", () => {
        for (const value of ["a", null, [literalJSON], { $rgx: true }, { $rgx: true, class: "Nope" }]) {
            expect(isRGXJSONObjectToken(value)).toBe(false);
            expect(() => assertRGXJSONObjectToken(value)).toThrow(RGXInvalidJSONTokenError);
        }
        expect(isRGXJSONObjectToken({ $rgx: true, class: "Nope" }, false)).toBe(true);
    });
});

describe("isRGXJSONToken", () => {
    it("accepts natives, object tokens, and arrays of them", () => {
        for (const value of ["a", 1, true, null, literalJSON, classJSON, [], ["a", literalJSON, [classJSON, null]]]) {
            expect(isRGXJSONToken(value)).toBe(true);
            expect(() => assertRGXJSONToken(value)).not.toThrow();
        }
    });

    it("rejects other values", () => {
        for (const value of [undefined, NaN, /a/, {}, { toRgx: () => "a" }, [undefined], [{ $rgx: true, class: "Nope" }], new RGXSubpatternToken(1)]) {
            expect(isRGXJSONToken(value)).toBe(false);
            expect(() => assertRGXJSONToken(value)).toThrow(RGXInvalidJSONTokenError);
        }
    });

    it("skips content checks when contentCheck is false", () => {
        expect(isRGXJSONToken([undefined], false)).toBe(true);
        expect(isRGXJSONToken([{ $rgx: true, class: "Nope" }], false)).toBe(true);
        expect(isRGXJSONToken({ $rgx: true, class: "Nope" }, false)).toBe(true);
    });
});

describe("isRGXToken with JSON tokens", () => {
    it("accepts JSON object tokens as any token by default", () => {
        expect(isRGXToken(literalJSON)).toBe(true);
        expect(isRGXToken(classJSON)).toBe(true);
        expect(isRGXToken([literalJSON, classJSON])).toBe(true);
        expect(() => assertRGXToken(classJSON)).not.toThrow();
    });

    it("rejects JSON object tokens when acceptJSON is false", () => {
        expect(isRGXToken(literalJSON, null, true, false)).toBe(false);
        expect(isRGXToken(classJSON, null, true, false)).toBe(false);
        expect(isRGXToken([literalJSON], null, true, false)).toBe(false);
        expect(isRGXToken("a", null, true, false)).toBe(true);
        expect(() => assertRGXToken(classJSON, null, true, false)).toThrow(RGXInvalidTokenError);
    });

    it("matches JSON literal tokens as literals", () => {
        expect(isRGXToken(literalJSON, "literal")).toBe(true);
        expect(isRGXToken(literalJSON, "literal", true, false)).toBe(false);
        expect(isRGXToken(literalJSON, "class")).toBe(false);
        expect(isRGXToken(literalJSON, "convertible")).toBe(false);
        expect(isRGXToken(literalJSON, "native")).toBe(false);
    });

    it("matches JSON class tokens as class and convertible tokens", () => {
        expect(isRGXToken(classJSON, "class")).toBe(true);
        expect(isRGXToken(classJSON, "convertible")).toBe(true);
        expect(isRGXToken(classJSON, "class", true, false)).toBe(false);
        expect(isRGXToken(classJSON, "convertible", true, false)).toBe(false);
        expect(isRGXToken(classJSON, "literal")).toBe(false);
        // Unregistered class tokens are not valid tokens
        expect(isRGXToken({ $rgx: true, class: "Nope" }, "class")).toBe(false);
    });

    it("matches JSON class tokens against constructors", () => {
        expect(isRGXToken(classJSON, RGXSubpatternToken)).toBe(true);
        expect(isRGXToken(classJSON, RGXGroupToken)).toBe(false);
        expect(isRGXToken(classJSON, RGXLookaheadToken)).toBe(false);
        expect(isRGXToken(classJSON, RGXSubpatternToken, true, false)).toBe(false);
        expect(isRGXToken(new RGXSubpatternToken(1), RGXSubpatternToken, true, false)).toBe(true);
    });

    it("supports the json type", () => {
        expect(isRGXToken("a", "json")).toBe(true);
        expect(isRGXToken(literalJSON, "json")).toBe(true);
        expect(isRGXToken([classJSON], "json")).toBe(true);
        expect(isRGXToken(/a/, "json")).toBe(false);
        expect(isRGXToken(undefined, "json")).toBe(false);
        // The json type is explicit, so acceptJSON is ignored
        expect(isRGXToken(literalJSON, "json", true, false)).toBe(true);
        expect(() => assertRGXToken(/a/, "json")).toThrow(RGXInvalidTokenError);
    });

    it("checks repeatability of JSON tokens", () => {
        expect(isRGXToken(literalJSON, "repeatable")).toBe(true);
        expect(isRGXToken(classJSON, "repeatable")).toBe(true);
        expect(isRGXToken(lookaheadJSON, "repeatable")).toBe(false);
        expect(isRGXToken(lookaheadJSON, "repeatable", true, false)).toBe(false);
        expect(isRGXToken(literalJSON, "repeatable", true, false)).toBe(false);
    });

    it("matches tuples with JSON tokens", () => {
        expect(isRGXToken([literalJSON, classJSON], ["literal", RGXSubpatternToken])).toBe(true);
        expect(isRGXToken([literalJSON, classJSON], ["literal", RGXSubpatternToken], true, false)).toBe(false);
    });
});

describe("isRGXArrayToken with JSON tokens", () => {
    it("respects acceptJSON", () => {
        expect(isRGXArrayToken([literalJSON])).toBe(true);
        expect(isRGXArrayToken([[classJSON]])).toBe(true);
        expect(isRGXArrayToken([literalJSON], true, false)).toBe(false);
        expect(isRGXArrayToken([[classJSON]], true, false)).toBe(false);
        expect(isRGXArrayToken([literalJSON], false, false)).toBe(true);
    });
});

describe("isRGXConvertibleToken with JSON tokens", () => {
    it("respects acceptJSON for the toRgx return value", () => {
        const token = { toRgx: () => literalJSON };
        const arrayToken = { toRgx: () => [classJSON] };
        const nested = { toRgx: () => ({ toRgx: () => classJSON }) };
        expect(isRGXConvertibleToken(token)).toBe(true);
        expect(isRGXConvertibleToken(arrayToken)).toBe(true);
        expect(isRGXConvertibleToken(nested)).toBe(true);
        expect(isRGXConvertibleToken(token, true, false)).toBe(false);
        expect(isRGXConvertibleToken(arrayToken, true, false)).toBe(false);
        expect(isRGXConvertibleToken(nested, true, false)).toBe(false);
        expect(isRGXConvertibleToken(token, false, false)).toBe(true);
    });
});

describe("isRGXGroupedToken with JSON tokens", () => {
    it("treats JSON literal tokens as groups", () => {
        expect(isRGXGroupedToken(literalJSON)).toBe(true);
        expect(isRGXGroupedToken(literalJSON, true, false)).toBe(false);
        expect(isRGXGroupedToken({ $rgx: true, source: "[" }, false)).toBe(true);
        expect(isRGXGroupedToken({ $rgx: true, source: "[" })).toBe(false);
    });

    it("checks the converted class token for JSON class tokens", () => {
        expect(isRGXGroupedToken(lookaheadJSON)).toBe(true);
        expect(isRGXGroupedToken(groupJSON)).toBe(true);
        expect(isRGXGroupedToken(wrapperJSON)).toBe(false);
        expect(isRGXGroupedToken(lookaheadJSON, true, false)).toBe(false);
        expect(() => assertRGXGroupedToken(wrapperJSON)).toThrow(RGXInvalidTokenError);
        expect(() => assertRGXGroupedToken(lookaheadJSON)).not.toThrow();
    });

    it("respects acceptJSON within arrays and convertible results", () => {
        expect(isRGXGroupedToken([literalJSON])).toBe(true);
        expect(isRGXGroupedToken([literalJSON], true, false)).toBe(false);
        expect(isRGXGroupedToken({ rgxGroupWrap: true, toRgx: () => literalJSON })).toBe(true);
        expect(isRGXGroupedToken({ rgxGroupWrap: true, toRgx: () => literalJSON }, true, false)).toBe(false);
    });
});

describe("rgxTokenType with JSON tokens", () => {
    it("identifies JSON object tokens as json", () => {
        expect(rgxTokenTypeFlat(literalJSON)).toBe("json");
        expect(rgxTokenTypeFlat(classJSON)).toBe("json");
        expect(rgxTokenType([literalJSON, "a", [classJSON]])).toEqual(["json", "native", ["json"]]);
    });

    it("throws for JSON object tokens when acceptJSON is false", () => {
        expect(() => rgxTokenTypeFlat(literalJSON, true, false)).toThrow(RGXInvalidTokenError);
        expect(() => rgxTokenType([literalJSON], true, false)).toThrow(RGXInvalidTokenError);
        expect(rgxTokenType(["a"], true, false)).toEqual(["native"]);
    });

    it("throws for invalid JSON object tokens", () => {
        expect(() => rgxTokenTypeFlat({ $rgx: true, class: "Nope" })).toThrow(RGXInvalidTokenError);
    });

    it("passes json through rgxTokenTypeGuardInputToFlat", () => {
        expect(rgxTokenTypeGuardInputToFlat("json")).toBe("json");
    });

    it("does not treat JSON-flagged convertible objects as convertible", () => {
        // The $rgx flag signals explicit intent, so this is identified as a JSON token.
        expect(rgxTokenTypeFlat({ ...literalJSON, toRgx: () => "a" })).toBe("json");
    });
});
