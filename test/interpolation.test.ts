import {
    rgxa, rgxInterpolation, resolveRGXToken, isRGXInterpolationToken, assertRGXInterpolationToken,
    isRGXJSONInterpolationToken, assertRGXJSONInterpolationToken, isRGXJSONLiteralToken, isRGXJSONClassToken,
    isRGXJSONObjectToken, isRGXJSONToken, createRGXJSONInterpolationToken, isRGXToken, isRGXArrayToken,
    rgxTokenType, rgxTokenToJSON, rgxTokenFromJSON, rgxTokenFromJSONString, cloneRGXToken, RGXRepeatToken,
    RGXClassWrapperToken, RGXInvalidTokenError, RGXInvalidJSONTokenError, RGXNotSupportedError
} from "src/index";
import rgx from "src/index";
import { rgxTaggedTemplateToArray } from "src/internal";

function template(strings: TemplateStringsArray, ..._tokens: unknown[]) {
    return strings;
}

describe("rgxInterpolation", () => {
    it("creates an interpolation token", () => {
        expect(rgxInterpolation("(foo")).toEqual({ rgxInterpolation: "(foo" });
    });
});

describe("isRGXInterpolationToken", () => {
    it("accepts objects with an rgxInterpolation string", () => {
        expect(isRGXInterpolationToken({ rgxInterpolation: "(foo" })).toBe(true);
        expect(() => assertRGXInterpolationToken({ rgxInterpolation: "(foo" })).not.toThrow();
    });

    it("rejects other values", () => {
        for (const value of [null, "foo", [], { rgxInterpolation: 1 }, { rgxInterpolation: "a", toRgx: () => "a" }, /a/]) {
            expect(isRGXInterpolationToken(value)).toBe(false);
            expect(() => assertRGXInterpolationToken(value)).toThrow(RGXInvalidTokenError);
        }
    });

    it("is recognized by the general type guards", () => {
        const token = rgxInterpolation("(foo");
        expect(rgxTokenType(token)).toBe("interpolation");
        expect(isRGXToken(token)).toBe(true);
        expect(isRGXToken(token, "interpolation")).toBe(true);
        expect(isRGXToken(token, "convertible")).toBe(false);
        expect(isRGXToken("foo", "interpolation")).toBe(false);
        expect(isRGXArrayToken(["a", token])).toBe(true);
    });

    it("is never repeatable", () => {
        expect(isRGXToken(rgxInterpolation("a"), "repeatable")).toBe(false);
        expect(isRGXToken({ $rgx: true, interpolation: "a" }, "repeatable")).toBe(false);
        expect(isRGXToken({ $rgx: true, interpolation: "a" }, "repeatable", true, false)).toBe(false);
        expect(() => new RGXRepeatToken(rgxInterpolation("a"))).toThrow(RGXNotSupportedError);
        expect(() => new RGXRepeatToken({ $rgx: true, interpolation: "a" })).toThrow(RGXNotSupportedError);
        expect(new RGXClassWrapperToken(rgxInterpolation("a")).rgxIsRepeatable).toBe(false);
    });
});

describe("isRGXJSONInterpolationToken", () => {
    it("accepts JSON objects with an interpolation string, even if it is not a valid regex", () => {
        expect(isRGXJSONInterpolationToken({ $rgx: true, interpolation: "(foo" })).toBe(true);
        expect(() => assertRGXJSONInterpolationToken({ $rgx: true, interpolation: "(foo" })).not.toThrow();
        expect(isRGXJSONObjectToken({ $rgx: true, interpolation: "(foo" })).toBe(true);
        expect(isRGXJSONToken([{ $rgx: true, interpolation: "(foo" }])).toBe(true);
        expect(isRGXToken({ $rgx: true, interpolation: "(foo" }, "interpolation")).toBe(true);
        expect(isRGXToken({ $rgx: true, interpolation: "(foo" }, "interpolation", true, false)).toBe(false);
        expect(rgxTokenType({ $rgx: true, interpolation: "(foo" })).toBe("json");
    });

    it("rejects other values", () => {
        for (const value of [{ interpolation: "a" }, { $rgx: true, interpolation: 1 }, { $rgx: true, interpolation: "a", source: "a" }, { $rgx: true, interpolation: "a", class: "RGXGroupToken" }]) {
            expect(isRGXJSONInterpolationToken(value)).toBe(false);
            expect(() => assertRGXJSONInterpolationToken(value)).toThrow(RGXInvalidJSONTokenError);
        }
    });

    it("is told apart from the other JSON object forms", () => {
        expect(isRGXJSONLiteralToken({ $rgx: true, source: "a", interpolation: "a" })).toBe(false);
        expect(isRGXJSONClassToken({ $rgx: true, class: "RGXGroupToken", interpolation: "a" })).toBe(false);
    });
});

describe("interpolation token JSON conversion", () => {
    it("serializes interpolation tokens as-is", () => {
        expect(createRGXJSONInterpolationToken("(foo")).toEqual({ $rgx: true, interpolation: "(foo" });
        expect(rgxTokenToJSON(rgxInterpolation("(foo"))).toEqual({ $rgx: true, interpolation: "(foo" });
        expect(rgxTokenToJSON(["a", rgxInterpolation("(foo")])).toEqual(["a", { $rgx: true, interpolation: "(foo" }]);
    });

    it("converts JSON interpolation tokens back", () => {
        expect(rgxTokenFromJSON({ $rgx: true, interpolation: "(foo" })).toEqual(rgxInterpolation("(foo"));
        expect(rgxTokenFromJSONString('{"$rgx":true,"interpolation":"(foo"}')).toEqual(rgxInterpolation("(foo"));
    });

    it("resolves JSON interpolation tokens like interpolation tokens", () => {
        expect(resolveRGXToken({ $rgx: true, interpolation: "(foo" })).toBe("(foo");
        expect(rgxa([{ $rgx: true, interpolation: "(foo" }, { $rgx: true, interpolation: ")" }]).source).toBe("(foo)");
    });
});

describe("interpolation token resolution", () => {
    it("allows interpolations that balance each other in a pattern", () => {
        expect(rgxa([rgxInterpolation("(?<name>"), "a.", rgxInterpolation(")+")]).source).toBe("(?<name>a\\.)+");
    });

    it("rejects patterns whose interpolations are left unbalanced", () => {
        expect(() => rgxa([rgxInterpolation("(foo")])).toThrow();
    });
});

describe("cloneRGXToken with interpolation tokens", () => {
    it("clones interpolation tokens", () => {
        const token = rgxInterpolation("(foo");
        const clone = cloneRGXToken(token);
        expect(clone).toEqual(token);
        expect(clone).not.toBe(token);
        expect(cloneRGXToken(token, 0)).toBe(token);
    });
});

describe("tagged templates", () => {
    it("pushes interpolation tokens for template strings when verbatim is false", () => {
        expect(rgxTaggedTemplateToArray(template`(a${"b"})`, ["b"], false, false)).toEqual([
            rgxInterpolation("(a"), "b", rgxInterpolation(")")
        ]);

        expect(rgxTaggedTemplateToArray(template`
            (a
            ${"b"})
        `, ["b"], true, false)).toEqual([rgxInterpolation("(a"), "b", rgxInterpolation(")")]);
    });

    it("builds patterns from template strings with unbalanced parentheses when verbatim is false", () => {
        expect(rgx("", { verbatim: false })`(a${"."})`.source).toBe("(a\\.)");
    });
});
