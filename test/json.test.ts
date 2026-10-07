import {
    rgxTokenToJSON, rgxTokenFromJSON, rgxTokenToJSONString, rgxTokenFromJSONString,
    registerRGXJSONClass, registerRGXJSONClassToken, unregisterRGXJSONClass, hasRGXJSONClass, getRGXJSONClass,
    listRGXJSONClasses, assertHasRGXJSONClass, assertNotHasRGXJSONClass, validateRGXJSONClassArgs, assertValidRGXJSONClassArgs,
    createRGXJSONClassToken, createRGXJSONLiteralToken, assertRGXJSONClassTokenOf, rgxJSONClassArgs,
    RGX_BUILTIN_JSON_CLASSES, registerBuiltinRGXJSONClasses,
    RGXClassToken, RGXClassWrapperToken, RGXClassUnionToken, RGXGroupToken, RGXRepeatToken,
    RGXLookaheadToken, RGXLookbehindToken, RGXExclusionToken, RGXSubpatternToken, RGXTokenCollection,
    ExtRegExp, registerFlagTransformer, unregisterFlagTransformer,
    RGXInvalidJSONClassKeyError, RGXJSONClassConflictError, RGXJSONClassArgsValidationFailedError,
    RGXNotJSONSerializableError, RGXInvalidJSONTokenError, RGXInvalidTokenError, RGXNotImplementedError, RGXInvalidRegexStringError,
    RGXJSONClassToken, RGXJSONToken, RGXJSONValue, RGXToken, rgxConstant, resolveRGXToken, rgxa, RGXInsertionRejectedError
} from "src/index";
import { expectError } from "./utils";

class TestClassToken extends RGXClassToken {
    value: string;

    constructor(value: string = "test") {
        super();
        this.value = value;
    }

    toRgx() {
        return this.value;
    }

    clone() {
        return new TestClassToken(this.value);
    }

    static validateJSONArgs(args: RGXJSONValue[]): boolean | string {
        if (args.length !== 1) return "Expected exactly 1 argument.";
        if (typeof args[0] !== "string") return false;
        return true;
    }

    static fromJSON(json: RGXJSONClassToken): TestClassToken {
        const [value] = rgxJSONClassArgs(json, "TestClassToken", TestClassToken.validateJSONArgs) as [string];
        return new TestClassToken(value);
    }

    toJSON() {
        return createRGXJSONClassToken("TestClassToken", [this.value]);
    }
}

class RejectingClassToken extends RGXClassToken {
    toRgx() {
        return "reject";
    }

    clone() {
        return new RejectingClassToken();
    }

    rgxAcceptInsertion() {
        return "always rejected";
    }

    toJSON() {
        return createRGXJSONClassToken("RejectingClassToken", []);
    }
}

class UnimplementedClassToken extends RGXClassToken {
    toRgx() {
        return "x";
    }

    clone() {
        return new UnimplementedClassToken();
    }
}

function roundTrip(token: RGXToken) {
    const json = rgxTokenToJSON(token);
    // Must survive actual serialization.
    const reparsed = JSON.parse(JSON.stringify(json));
    expect(reparsed).toEqual(json);
    return rgxTokenFromJSON(reparsed);
}

describe("JSON class registry", () => {
    it("has the built-in classes registered", () => {
        for (const name of Object.keys(RGX_BUILTIN_JSON_CLASSES)) {
            expect(hasRGXJSONClass(name)).toBe(true);
            expect(() => assertHasRGXJSONClass(name)).not.toThrow();
            expect(() => assertNotHasRGXJSONClass(name)).toThrow(RGXJSONClassConflictError);
            expect(listRGXJSONClasses()).toContain(name);
        }
    });

    it("can register the built-in classes more than once without error", () => {
        expect(() => registerBuiltinRGXJSONClasses()).not.toThrow();
    });

    it("reports unregistered classes", () => {
        expect(hasRGXJSONClass("Nope")).toBe(false);
        expect(() => assertHasRGXJSONClass("Nope")).toThrow(RGXInvalidJSONClassKeyError);
        expect(() => assertNotHasRGXJSONClass("Nope")).not.toThrow();
        expect(() => getRGXJSONClass("Nope")).toThrow(RGXInvalidJSONClassKeyError);
        expect(() => unregisterRGXJSONClass("Nope")).toThrow(RGXInvalidJSONClassKeyError);
    });

    it("registers and unregisters custom entries", () => {
        const entry = registerRGXJSONClass("Custom", {
            validateArgs: args => args.length === 1 && typeof args[0] === "string",
            construct: args => new TestClassToken(args[0] as string)
        });

        expect(getRGXJSONClass("Custom")).toBe(entry);
        expect(() => registerRGXJSONClass("Custom", entry)).toThrow(RGXJSONClassConflictError);

        const token = rgxTokenFromJSON({ $rgx: true, class: "Custom", args: ["abc"] });
        expect(token).toBeInstanceOf(TestClassToken);
        expect((token as TestClassToken).value).toBe("abc");

        unregisterRGXJSONClass("Custom");
        expect(hasRGXJSONClass("Custom")).toBe(false);
    });

    it("registers class token constructors directly", () => {
        registerRGXJSONClassToken("TestClassToken", TestClassToken);
        const token = rgxTokenFromJSON({ $rgx: true, class: "TestClassToken", args: ["hello"] });
        expect(token).toBeInstanceOf(TestClassToken);
        expect((token as TestClassToken).value).toBe("hello");
        unregisterRGXJSONClass("TestClassToken");
    });

    it("validates args through the registry", () => {
        registerRGXJSONClassToken("TestClassToken", TestClassToken);

        expect(validateRGXJSONClassArgs("TestClassToken", ["a"])).toBe(true);
        expect(validateRGXJSONClassArgs("TestClassToken", [])).toBe("Expected exactly 1 argument.");
        // false results get a default message
        expect(validateRGXJSONClassArgs("TestClassToken", [1])).toBe("Argument validation failed.");

        expect(() => assertValidRGXJSONClassArgs("TestClassToken", ["a"])).not.toThrow();
        expectError(() => assertValidRGXJSONClassArgs("TestClassToken", [1]), RGXJSONClassArgsValidationFailedError, error => {
            expect(error.className).toBe("TestClassToken");
            expect(error.args).toEqual([1]);
            expect(error.reason).toBe("Argument validation failed.");
        });

        unregisterRGXJSONClass("TestClassToken");
    });
});

describe("RGXClassToken JSON defaults", () => {
    it("falls back to resolving the token into a JSON literal token for the default toJSON method", () => {
        expect(new UnimplementedClassToken().toJSON()).toEqual({ $rgx: true, source: "x" });
        expect(rgxTokenToJSON(new UnimplementedClassToken())).toEqual({ $rgx: true, source: "x" });
        expect(JSON.parse(JSON.stringify(new UnimplementedClassToken()))).toEqual({ $rgx: true, source: "x" });
        // Nested within built-in class tokens
        expect(rgxTokenToJSON(new RGXGroupToken({}, [new UnimplementedClassToken()]))).toEqual(
            rgxTokenToJSON(new RGXGroupToken({}, [{ $rgx: true, source: "x" }]))
        );
    });

    it("rejects class tokens without a custom toJSON method when resolveConvertible is false", () => {
        expect(() => rgxTokenToJSON(new UnimplementedClassToken(), { resolveConvertible: false })).toThrow(RGXNotJSONSerializableError);
        expect(rgxTokenToJSON(new TestClassToken("a"), { resolveConvertible: false })).toEqual({ $rgx: true, class: "TestClassToken", args: ["a"] });
    });

    it("throws RGXNotImplementedError for the default static methods", () => {
        expect(() => UnimplementedClassToken.validateJSONArgs([])).toThrow(RGXNotImplementedError);
        expect(() => UnimplementedClassToken.fromJSON({ $rgx: true, class: "UnimplementedClassToken" })).toThrow(RGXNotImplementedError);
    });
});

describe("JSON class token helpers", () => {
    it("creates class tokens", () => {
        expect(createRGXJSONClassToken("X")).toEqual({ $rgx: true, class: "X", args: [] });
        expect(createRGXJSONClassToken("X", [1, "a"])).toEqual({ $rgx: true, class: "X", args: [1, "a"] });
    });

    it("creates literal tokens", () => {
        expect(createRGXJSONLiteralToken("abc")).toEqual({ $rgx: true, source: "abc" });
        expect(createRGXJSONLiteralToken("abc", "i")).toEqual({ $rgx: true, source: "abc", flags: "i" });
        expect(() => createRGXJSONLiteralToken("[")).toThrow(RGXInvalidRegexStringError);
    });

    it("asserts that a class token is for a given class", () => {
        expect(() => assertRGXJSONClassTokenOf({ $rgx: true, class: "X" }, "X")).not.toThrow();
        expectError(() => assertRGXJSONClassTokenOf({ $rgx: true, class: "Y" }, "X"), RGXInvalidJSONTokenError, error => {
            expect(error.code).toBe("INVALID_RGX_JSON_TOKEN");
            expect(error).toBeInstanceOf(RGXInvalidTokenError);
            expect(error.message).toContain('JSON class token with class "X"');
        });
        expect(() => assertRGXJSONClassTokenOf({ class: "X" }, "X")).toThrow(RGXInvalidJSONTokenError);
    });

    it("extracts validated args", () => {
        expect(rgxJSONClassArgs({ $rgx: true, class: "X", args: ["a"] }, "X", () => true)).toEqual(["a"]);
        expect(rgxJSONClassArgs({ $rgx: true, class: "X" }, "X", () => true)).toEqual([]);
        expectError(() => rgxJSONClassArgs({ $rgx: true, class: "X", args: [1] }, "X", () => "bad"), RGXJSONClassArgsValidationFailedError, error => {
            expect(error.reason).toBe("bad");
            expect(error.toString()).toBe('RGXJSONClassArgsValidationFailedError: JSON class argument validation failed; Class: "X"; Args: [1]; Reason: bad');
        });
        expectError(() => rgxJSONClassArgs({ $rgx: true, class: "X", args: [1] }, "X", () => false), RGXJSONClassArgsValidationFailedError, error => {
            expect(error.reason).toBe("Argument validation failed.");
        });
    });
});

describe("rgxTokenToJSON", () => {
    it("converts no-op tokens to null", () => {
        expect(rgxTokenToJSON(null)).toBe(null);
        expect(rgxTokenToJSON(undefined)).toBe(null);
    });

    it("leaves native tokens as-is", () => {
        expect(rgxTokenToJSON("abc")).toBe("abc");
        expect(rgxTokenToJSON(42)).toBe(42);
        expect(rgxTokenToJSON(true)).toBe(true);
    });

    it("rejects non-finite numbers", () => {
        expect(() => rgxTokenToJSON(NaN)).toThrow(RGXNotJSONSerializableError);
        expect(() => rgxTokenToJSON(Infinity)).toThrow(RGXNotJSONSerializableError);
    });

    it("converts literal tokens", () => {
        expect(rgxTokenToJSON(/abc/)).toEqual({ $rgx: true, source: "abc" });
        expect(rgxTokenToJSON(/abc/gi)).toEqual({ $rgx: true, source: "abc", flags: "gi" });
    });

    it("drops custom flags from ExtRegExp literals since the source already has them applied", () => {
        registerFlagTransformer("q", exp => [exp.source + "q", exp.flags]);
        try {
            const regex = new ExtRegExp("abc", "iq");
            expect(regex.source).toBe("abcq");
            expect(rgxTokenToJSON(regex)).toEqual({ $rgx: true, source: "abcq", flags: "i" });
        } finally {
            unregisterFlagTransformer("q");
        }
    });

    it("returns valid JSON object tokens as-is", () => {
        const literal = { $rgx: true as const, source: "abc" };
        const cls = { $rgx: true as const, class: "RGXSubpatternToken", args: [1] };
        expect(rgxTokenToJSON(literal)).toBe(literal);
        expect(rgxTokenToJSON(cls)).toBe(cls);
    });

    it("rejects invalid JSON object tokens", () => {
        expect(() => rgxTokenToJSON({ $rgx: true, source: "[" })).toThrow(RGXInvalidJSONTokenError);
        expect(() => rgxTokenToJSON({ $rgx: true, class: "Nope" })).toThrow(RGXInvalidJSONTokenError);
    });

    it("converts class tokens through toJSON", () => {
        expect(rgxTokenToJSON(new RGXSubpatternToken(2))).toEqual({ $rgx: true, class: "RGXSubpatternToken", args: [2] });
    });

    it("converts collections through toRGXClassToken", () => {
        expect(rgxTokenToJSON(new RGXTokenCollection(["a", "b"], "union"))).toEqual({ $rgx: true, class: "RGXClassUnionToken", args: [["a", "b"]] });
        expect(rgxTokenToJSON(new RGXTokenCollection(["a", "b"], "concat"))).toEqual({
            $rgx: true, class: "RGXGroupToken", args: [{ name: null, capturing: false, flags: "" }, ["a", "b"]]
        });
    });

    it("resolves plain convertible tokens into literal tokens by default", () => {
        expect(rgxTokenToJSON({ toRgx: () => "abc" })).toEqual({ $rgx: true, source: "abc" });
        expect(rgxTokenToJSON({ toRgx: () => ["a", "b"] })).toEqual({ $rgx: true, source: "a|b" });
        expect(rgxTokenToJSON(rgxConstant("start"))).toEqual({ $rgx: true, class: "RGXClassWrapperToken", args: [{ $rgx: true, source: "^" }] });
    });

    it("rejects plain convertible tokens when resolveConvertible is false", () => {
        expectError(() => rgxTokenToJSON({ toRgx: () => "abc" }, { resolveConvertible: false }), RGXNotJSONSerializableError, error => {
            expect(error.code).toBe("NOT_JSON_SERIALIZABLE");
            expect(error.reason).not.toBeNull();
        });
        // The option propagates into arrays
        expect(() => rgxTokenToJSON(["a", { toRgx: () => "abc" }], { resolveConvertible: false })).toThrow(RGXNotJSONSerializableError);
    });

    it("converts arrays element-wise", () => {
        expect(rgxTokenToJSON(["a", /b/, undefined, ["c"]])).toEqual(["a", { $rgx: true, source: "b" }, null, ["c"]]);
    });
});

describe("rgxTokenFromJSON", () => {
    it("leaves native tokens as-is", () => {
        expect(rgxTokenFromJSON("abc")).toBe("abc");
        expect(rgxTokenFromJSON(42)).toBe(42);
        expect(rgxTokenFromJSON(false)).toBe(false);
        expect(rgxTokenFromJSON(null)).toBe(null);
    });

    it("converts literal tokens to ExtRegExp", () => {
        const regex = rgxTokenFromJSON({ $rgx: true, source: "abc", flags: "i" });
        expect(regex).toBeInstanceOf(ExtRegExp);
        expect((regex as RegExp).source).toBe("abc");
        expect((regex as RegExp).flags).toBe("i");

        const noFlags = rgxTokenFromJSON({ $rgx: true, source: "abc" }) as RegExp;
        expect(noFlags.flags).toBe("");
    });

    it("rejects literal tokens with invalid content", () => {
        expect(() => rgxTokenFromJSON({ $rgx: true, source: "[" })).toThrow(RGXInvalidJSONTokenError);
        expect(() => rgxTokenFromJSON({ $rgx: true, source: "a", flags: "zz" })).toThrow(RGXInvalidJSONTokenError);
    });

    it("converts class tokens through the registry", () => {
        const token = rgxTokenFromJSON({ $rgx: true, class: "RGXSubpatternToken", args: [3] });
        expect(token).toBeInstanceOf(RGXSubpatternToken);
        expect((token as RGXSubpatternToken).pattern).toBe(3);
    });

    it("rejects unregistered classes and invalid args", () => {
        expect(() => rgxTokenFromJSON({ $rgx: true, class: "Nope" })).toThrow(RGXInvalidJSONClassKeyError);
        expect(() => rgxTokenFromJSON({ $rgx: true, class: "RGXSubpatternToken", args: [] })).toThrow(RGXJSONClassArgsValidationFailedError);
    });

    it("converts arrays element-wise", () => {
        const result = rgxTokenFromJSON(["a", { $rgx: true, source: "b" }, null]) as RGXToken[];
        expect(result[0]).toBe("a");
        expect(result[1]).toBeInstanceOf(ExtRegExp);
        expect(result[2]).toBe(null);
    });

    it("rejects values that are not JSON tokens", () => {
        expect(() => rgxTokenFromJSON(undefined as unknown as RGXJSONToken)).toThrow(RGXInvalidJSONTokenError);
        expect(() => rgxTokenFromJSON({ foo: 1 } as unknown as RGXJSONToken)).toThrow(RGXInvalidJSONTokenError);
    });
});

describe("JSON string helpers", () => {
    it("round-trips through strings", () => {
        const str = rgxTokenToJSONString(["a", /b/i]);
        expect(str).toBe('["a",{"$rgx":true,"source":"b","flags":"i"}]');
        const result = rgxTokenFromJSONString(str) as RGXToken[];
        expect(result[0]).toBe("a");
        expect(result[1]).toBeInstanceOf(ExtRegExp);
    });

    it("supports pretty printing", () => {
        expect(rgxTokenToJSONString("a", {}, 2)).toBe('"a"');
        expect(rgxTokenToJSONString(/a/, {}, 2)).toBe('{\n  "$rgx": true,\n  "source": "a"\n}');
    });

    it("rejects invalid JSON strings", () => {
        expectError(() => rgxTokenFromJSONString("{not json"), RGXInvalidJSONTokenError, error => {
            expect(error.message).toContain("Invalid JSON string");
        });
    });

    it("rejects JSON strings that are not JSON tokens", () => {
        expect(() => rgxTokenFromJSONString('{"foo": 1}')).toThrow(RGXInvalidJSONTokenError);
        expect(() => rgxTokenFromJSONString('[{"foo": 1}]')).toThrow(RGXInvalidJSONTokenError);
    });
});

describe("built-in class token round trips", () => {
    it("RGXClassWrapperToken", () => {
        const token = new RGXClassWrapperToken(/abc/i);
        expect(token.toJSON()).toEqual({ $rgx: true, class: "RGXClassWrapperToken", args: [{ $rgx: true, source: "abc", flags: "i" }] });

        const result = roundTrip(token) as RGXClassWrapperToken;
        expect(result).toBeInstanceOf(RGXClassWrapperToken);
        expect(result.resolve()).toBe(token.resolve());

        expect(RGXClassWrapperToken.validateJSONArgs([])).toMatch(/exactly 1/);
        expect(RGXClassWrapperToken.validateJSONArgs([{ nope: 1 }])).toMatch(/JSON token/);
        expect(() => RGXClassWrapperToken.fromJSON({ $rgx: true, class: "RGXClassWrapperToken", args: [] })).toThrow(RGXJSONClassArgsValidationFailedError);
    });

    it("RGXClassUnionToken", () => {
        const token = new RGXClassUnionToken(["a", /b/, new RGXSubpatternToken(1)]);
        expect(token.toJSON()).toEqual({
            $rgx: true, class: "RGXClassUnionToken",
            args: [["a", { $rgx: true, source: "b" }, { $rgx: true, class: "RGXSubpatternToken", args: [1] }]]
        });

        const result = roundTrip(token) as RGXClassUnionToken;
        expect(result).toBeInstanceOf(RGXClassUnionToken);
        expect(result.resolve()).toBe(token.resolve());

        expect(RGXClassUnionToken.fromJSON({ $rgx: true, class: "RGXClassUnionToken" }).tokens.length).toBe(0);
        expect(RGXClassUnionToken.validateJSONArgs([[], []])).toMatch(/at most 1/);
        expect(RGXClassUnionToken.validateJSONArgs([{ nope: 1 }])).toMatch(/JSON token/);
    });

    it("RGXGroupToken", () => {
        const token = new RGXGroupToken({ name: "foo", flags: "i" }, ["a", /b/]);
        expect(token.toJSON()).toEqual({
            $rgx: true, class: "RGXGroupToken",
            args: [{ name: "foo", capturing: true, flags: "i" }, ["a", { $rgx: true, source: "b" }]]
        });

        const result = roundTrip(token) as RGXGroupToken;
        expect(result).toBeInstanceOf(RGXGroupToken);
        expect(result.resolve()).toBe(token.resolve());

        const nonCapturing = roundTrip(new RGXGroupToken({ capturing: false }, "a")) as RGXGroupToken;
        expect(nonCapturing.capturing).toBe(false);

        const empty = RGXGroupToken.fromJSON({ $rgx: true, class: "RGXGroupToken" });
        expect(empty.capturing).toBe(true);
        expect(empty.tokens.length).toBe(0);

        expect(RGXGroupToken.validateJSONArgs([{}, [], []])).toMatch(/at most 2/);
        expect(RGXGroupToken.validateJSONArgs([1])).toMatch(/must be an object/);
        expect(RGXGroupToken.validateJSONArgs([[]])).toMatch(/must be an object/);
        expect(RGXGroupToken.validateJSONArgs([{ name: 1 }])).toMatch(/name/);
        expect(RGXGroupToken.validateJSONArgs([{ capturing: "yes" }])).toMatch(/capturing/);
        expect(RGXGroupToken.validateJSONArgs([{ flags: 1 }])).toMatch(/flags/);
        expect(RGXGroupToken.validateJSONArgs([{}, { nope: 1 }])).toMatch(/tokens/);
        expect(RGXGroupToken.validateJSONArgs([{ name: null }, "a"])).toBe(true);
    });

    it("RGXRepeatToken", () => {
        const token = new RGXRepeatToken("a", 2, null, true);
        expect(token.toJSON()).toEqual({
            $rgx: true, class: "RGXRepeatToken",
            args: [{ $rgx: true, class: "RGXGroupToken", args: [{ name: null, capturing: false, flags: "" }, ["a"]] }, 2, null, true]
        });

        const result = roundTrip(token) as RGXRepeatToken;
        expect(result).toBeInstanceOf(RGXRepeatToken);
        expect(result.min).toBe(2);
        expect(result.max).toBe(null);
        expect(result.lazy).toBe(true);
        expect(result.resolve()).toBe(token.resolve());

        const defaults = RGXRepeatToken.fromJSON({ $rgx: true, class: "RGXRepeatToken", args: ["a"] });
        expect(defaults.min).toBe(1);
        expect(defaults.max).toBe(1);
        expect(defaults.lazy).toBe(false);

        const minOnly = RGXRepeatToken.fromJSON({ $rgx: true, class: "RGXRepeatToken", args: ["a", 3] });
        expect(minOnly.max).toBe(3);

        expect(RGXRepeatToken.validateJSONArgs([])).toMatch(/between 1 and 4/);
        expect(RGXRepeatToken.validateJSONArgs([{ nope: 1 }])).toMatch(/token/);
        expect(RGXRepeatToken.validateJSONArgs(["a", "1"])).toMatch(/min/);
        expect(RGXRepeatToken.validateJSONArgs(["a", 1, "2"])).toMatch(/max/);
        expect(RGXRepeatToken.validateJSONArgs(["a", 1, 2, "no"])).toMatch(/lazy/);
    });

    it("RGXLookaheadToken and RGXLookbehindToken", () => {
        for (const [Cls, name] of [[RGXLookaheadToken, "RGXLookaheadToken"], [RGXLookbehindToken, "RGXLookbehindToken"]] as const) {
            const token = new Cls(["a", /b/], false);
            expect(token.toJSON()).toEqual({ $rgx: true, class: name, args: [["a", { $rgx: true, source: "b" }], false] });

            const result = roundTrip(token) as RGXLookaheadToken;
            expect(result).toBeInstanceOf(Cls);
            expect(result.positive).toBe(false);
            expect(result.resolve()).toBe(token.resolve());

            const empty = Cls.fromJSON({ $rgx: true, class: name });
            expect(empty.positive).toBe(true);
            expect(empty.tokens.length).toBe(0);

            expect(Cls.validateJSONArgs([[], true, 1])).toMatch(/at most 2/);
            expect(Cls.validateJSONArgs([{ nope: 1 }])).toMatch(/tokens/);
            expect(Cls.validateJSONArgs([[], "yes"])).toMatch(/positive/);
        }
    });

    it("RGXExclusionToken", () => {
        const token = new RGXExclusionToken("ex", /\w+/, ["foo", "bar"], /\b/);
        expect(token.toJSON()).toEqual({
            $rgx: true, class: "RGXExclusionToken",
            args: ["ex", { $rgx: true, source: "\\w+" }, ["foo", "bar"], { $rgx: true, source: "\\b" }]
        });

        const result = roundTrip(token) as RGXExclusionToken;
        expect(result).toBeInstanceOf(RGXExclusionToken);
        expect(result.exclusionId).toBe("ex");
        expect(result.resolve()).toBe(token.resolve());

        const minimal = RGXExclusionToken.fromJSON({ $rgx: true, class: "RGXExclusionToken", args: ["ex", "a"] });
        expect(minimal.exclusions.tokens.length).toBe(0);
        expect(minimal.terminal).toBe(null);

        expect(RGXExclusionToken.validateJSONArgs(["ex"])).toMatch(/between 2 and 4/);
        expect(RGXExclusionToken.validateJSONArgs([1, "a"])).toMatch(/exclusionId/);
        expect(RGXExclusionToken.validateJSONArgs(["ex", { nope: 1 }])).toMatch(/token/);
        expect(RGXExclusionToken.validateJSONArgs(["ex", "a", { nope: 1 }])).toMatch(/exclusions/);
        expect(RGXExclusionToken.validateJSONArgs(["ex", "a", [], { nope: 1 }])).toMatch(/terminal/);
    });

    it("RGXSubpatternToken", () => {
        const named = roundTrip(new RGXSubpatternToken("foo")) as RGXSubpatternToken;
        expect(named).toBeInstanceOf(RGXSubpatternToken);
        expect(named.pattern).toBe("foo");

        const numbered = roundTrip(new RGXSubpatternToken(2)) as RGXSubpatternToken;
        expect(numbered.pattern).toBe(2);

        expect(RGXSubpatternToken.validateJSONArgs([])).toMatch(/exactly 1/);
        expect(RGXSubpatternToken.validateJSONArgs([true])).toMatch(/string or number/);
    });

    it("rejects JSON for a different class", () => {
        expect(() => RGXSubpatternToken.fromJSON({ $rgx: true, class: "RGXGroupToken", args: [] })).toThrow(RGXInvalidJSONTokenError);
    });

    it("round-trips a complex nested token", () => {
        const token = rgxConstant("digit").repeat(1, 3).group({ name: "num" }).or("abc").asLookahead();
        const result = roundTrip(token) as RGXClassToken;

        // Plain convertible tokens (like the one behind the "digit" constant) are resolved into literals,
        // so the resolved strings may differ in group wrapping, but the behavior must be identical.
        const original = new RegExp(token.resolve());
        const restored = new RegExp(result.resolve());
        for (const input of ["123", "12", "abc", "1234", "xyz", ""]) {
            expect(restored.exec(input)?.groups?.num).toBe(original.exec(input)?.groups?.num);
            expect(restored.test(input)).toBe(original.test(input));
        }
    });
});

describe("JSON tokens in the rest of the library", () => {
    it("resolves JSON literal tokens", () => {
        expect(resolveRGXToken({ $rgx: true, source: "abc" })).toBe("(?:abc)");
        expect(resolveRGXToken({ $rgx: true, source: "abc", flags: "i" })).toBe("(?i:abc)");
        expect(resolveRGXToken({ $rgx: true, source: "abc" }, { groupWrap: false })).toBe("abc");
    });

    it("resolves JSON class tokens", () => {
        expect(resolveRGXToken({ $rgx: true, class: "RGXSubpatternToken", args: [1] })).toBe(resolveRGXToken(new RGXSubpatternToken(1)));
        expect(resolveRGXToken(["a", { $rgx: true, class: "RGXGroupToken", args: [{ name: "x" }, ["b"]] }])).toBe("(?:a|(?<x>b))");
    });

    it("throws for invalid JSON tokens when resolving", () => {
        expect(() => resolveRGXToken({ $rgx: true, class: "Nope" })).toThrow(RGXInvalidJSONClassKeyError);
        expect(() => resolveRGXToken({ $rgx: true, source: "[" })).toThrow(RGXInvalidJSONTokenError);
    });

    it("works in rgxa", () => {
        const regex = rgxa(["a", { $rgx: true, source: "b" }, { $rgx: true, class: "RGXRepeatToken", args: ["c", 0, null] }]);
        expect(regex.source).toBe("a(?:b)(?:c)*");
    });

    it("checks insertion acceptance of JSON class tokens", () => {
        registerRGXJSONClass("RejectingClassToken", { validateArgs: () => true, construct: () => new RejectingClassToken() });
        try {
            expect(() => rgxa([{ $rgx: true, class: "RejectingClassToken" }])).toThrow(RGXInsertionRejectedError);
        } finally {
            unregisterRGXJSONClass("RejectingClassToken");
        }
    });

    it("removes duplicate JSON tokens in unions", () => {
        const union = new RGXClassUnionToken([{ $rgx: true, source: "a" }, { $rgx: true, source: "a" }, { $rgx: true, source: "b" }]);
        expect(union.tokens.length).toBe(2);
        expect(union.resolve()).toBe("(?:(?:a)|(?:b))");
    });

    it("wraps JSON tokens correctly in RGXClassWrapperToken", () => {
        const literalWrapper = new RGXClassWrapperToken({ $rgx: true, source: "a" });
        expect(literalWrapper.rgxIsGroup).toBe(true);
        expect(literalWrapper.rgxIsRepeatable).toBe(true);

        const lookaheadWrapper = new RGXClassWrapperToken({ $rgx: true, class: "RGXLookaheadToken", args: [["a"]] });
        expect(lookaheadWrapper.rgxIsGroup).toBe(true);
        expect(lookaheadWrapper.rgxIsRepeatable).toBe(false);

        // Same as wrapping the class token directly: its toRgx result is a literal, which is a group.
        const subpatternWrapper = new RGXClassWrapperToken({ $rgx: true, class: "RGXSubpatternToken", args: [1] });
        expect(subpatternWrapper.rgxIsGroup).toBe(true);
        expect(subpatternWrapper.rgxIsRepeatable).toBe(true);

        const nativeWrapper = new RGXClassWrapperToken({ $rgx: true, class: "RGXClassWrapperToken", args: ["a"] });
        expect(nativeWrapper.rgxIsGroup).toBe(false);
    });

    it("rejects repeating a non-repeatable JSON class token", () => {
        expect(() => new RGXRepeatToken({ $rgx: true, class: "RGXLookaheadToken", args: [["a"]] })).toThrow();
    });
});
