import { RGXClassWrapperToken, RGXConstantToken } from "src/class";
import { rgxConstant, rgxConstantValue, listRGXConstants, hasRGXConstant, assertHasRGXConstant, assertNotHasRGXConstant, defineRGXConstant, deleteRGXConstant, RGX_PREDEFINED_CONSTANTS } from "src/constants";
import { RGXConstantConflictError, RGXInvalidConstantKeyError } from "src/errors";
import { resolveRGXToken } from "src/resolve";

const expectedConstantNames = Object.keys(RGX_PREDEFINED_CONSTANTS);

describe("listRGXConstants", () => {
    it("has the default constants", () => {
        const constants = listRGXConstants();
        expect(constants).toEqual(expectedConstantNames);
    });
});

describe("hasRGXConstant", () => {
    it("returns true for existing constants", () => {
        for (const name of expectedConstantNames) {
            expect(hasRGXConstant(name)).toBe(true);
            expect(() => assertHasRGXConstant(name)).not.toThrow();
            expect(() => assertNotHasRGXConstant(name)).toThrow(RGXConstantConflictError);
        }
    });

    it("returns false for non-existing constants", () => {
        expect(hasRGXConstant("non-existing-constant")).toBe(false);
        expect(() => assertHasRGXConstant("non-existing-constant")).toThrow(RGXInvalidConstantKeyError);
        expect(() => assertNotHasRGXConstant("non-existing-constant")).not.toThrow();
    });
});

describe("defineRGXConstant", () => {
    it("defines a new constant", () => {
        const name = "test-constant";
        const value = new RGXClassWrapperToken({toRgx() { return "test"; }});

        expect(() => defineRGXConstant(name, value)).not.toThrow();
        expect(rgxConstantValue(name)).toBe(value);
        deleteRGXConstant(name);
    });

    it("wraps tokens in RGXClassWrapperToken", () => {
        const name = "test-native-constant";
        const value = "native-value";

        const definedValue = defineRGXConstant(name, value);
        expect(definedValue).not.toBe(value);
        expect(definedValue).toBeInstanceOf(RGXClassWrapperToken);
        expect((definedValue as RGXClassWrapperToken).token).toBe(value);
    });

    it("does not wrap values that are already RGXClassTokens", () => {
        const name = "test-class-constant";
        const value = new RGXClassWrapperToken("class-value");

        const definedValue = defineRGXConstant(name, value);
        expect(definedValue).toBe(value);
    });

    it("throws an error when defining a constant with an existing name", () => {
        const name = expectedConstantNames[0]!;
        expect(() => defineRGXConstant(name, "new value")).toThrow(RGXConstantConflictError);
    });

    it("accepts references to other constants", () => {
        defineRGXConstant("test-reference-constant", rgxConstant("digit"));
        expect(resolveRGXToken(rgxConstant("test-reference-constant"))).toBe(resolveRGXToken(rgxConstant("digit")));
        deleteRGXConstant("test-reference-constant");
    });

    it("throws an error when a constant would refer to itself", () => {
        defineRGXConstant("test-cycle-a", "a");
        const reference = rgxConstant("test-cycle-a");
        deleteRGXConstant("test-cycle-a");
        expect(() => defineRGXConstant("test-cycle-a", reference)).toThrow(RGXConstantConflictError);

        // Through another constant
        defineRGXConstant("test-cycle-a", "a");
        defineRGXConstant("test-cycle-b", rgxConstant("test-cycle-a"));
        deleteRGXConstant("test-cycle-a");
        expect(() => defineRGXConstant("test-cycle-a", rgxConstant("test-cycle-b"))).toThrow(RGXConstantConflictError);

        // References to constants that don't exist, or that refer to each other without this one, are allowed
        defineRGXConstant("test-cycle-c", "c");
        const missing = rgxConstant("test-cycle-c");
        deleteRGXConstant("test-cycle-c");
        expect(() => defineRGXConstant("test-cycle-a", missing)).not.toThrow();
        deleteRGXConstant("test-cycle-a");
        deleteRGXConstant("test-cycle-b");
    });
});

describe("deleteRGXConstant", () => {
    it("deletes an existing constant", () => {
        const name = expectedConstantNames[0]!;
        const prevToken = rgxConstantValue(name);
        expect(deleteRGXConstant(name)).toBe(prevToken);

        expect(() => rgxConstant(name)).toThrow(RGXInvalidConstantKeyError);

        // Restore the constant for other tests
        defineRGXConstant(name, prevToken);
    });

    it("throws an error when deleting a non-existing constant", () => {
        expect(() => deleteRGXConstant("non-existing-constant")).toThrow(RGXInvalidConstantKeyError);
    });
});

describe("rgxConstantValue", () => {
    it("returns the token a constant is defined as", () => {
        expect(rgxConstantValue("newline")).toBeInstanceOf(RGXClassWrapperToken);
        expect((rgxConstantValue("newline") as RGXClassWrapperToken).token).toBe("\n");
    });

    it("throws an error for non-existing constants", () => {
        expect(() => rgxConstantValue("non-existing-constant")).toThrow(RGXInvalidConstantKeyError);
    });
});

describe("rgxConstant", () => {
    it("returns a reference to existing constants", () => {
        for (const name of expectedConstantNames) {
            const value = rgxConstant(name);
            expect(value).toBeInstanceOf(RGXConstantToken);
            expect(value.name).toBe(name);
            expect(value.cache).toBe(false);
            expect(value.getConstant()).toBe(rgxConstantValue(name));
        }
    });

    it("passes the cache setting to the reference", () => {
        expect(rgxConstant("digit", true).cache).toBe(true);
    });

    it("throws an error for non-existing constants", () => {
        expect(() => rgxConstant("non-existing-constant")).toThrow(RGXInvalidConstantKeyError);
    });

    // Control Characters
    describe("newline constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("newline"));
            expect(result).toBe("\n");
        });
    });

    describe("carriage-return constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("carriage-return"));
            expect(result).toBe("\r");
        });
    });

    describe("tab constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("tab"));
            expect(result).toBe("\t");
        });
    });

    describe("null constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("null"));
            expect(result).toBe("\0");
        });
    });

    describe("form-feed constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("form-feed"));
            expect(result).toBe("\f");
        });
    });

    // Special Characters
    describe("any constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("any"));
            expect(result).toBe("(?s:.)");
        });
    });

    describe("non-newline constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("non-newline"));
            expect(result).toBe(".");
        });
    });

    describe("start constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("start"));
            expect(result).toBe("(?:^)");
        });
    });

    describe("line-start constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("line-start"));
            expect(result).toBe("(?m:^)");
        });
    });

    describe("end constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("end"));
            expect(result).toBe("(?:$)");
        });
    });

    describe("line-end constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("line-end"));
            expect(result).toBe("(?m:$)");
        });
    });

    describe("word-bound constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("word-bound"));
            expect(result).toBe("(?:\\b)");
        });
    });

    describe("non-word-bound constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("non-word-bound"));
            expect(result).toBe("(?:\\B)");
        });
    });

    describe("word-bound-start constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("word-bound-start"));
            expect(result).toBe("(?:(?<=\\W|^)(?=\\w))");
        });
    });

    describe("word-bound-end constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("word-bound-end"));
            expect(result).toBe("(?:(?<=\\w)(?=\\W|$))");
        });
    });

    // Character Sets
    describe("letter constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("letter"));
            expect(result).toBe("[a-zA-Z]");
        });
    });

    describe("lowercase-letter constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("lowercase-letter"));
            expect(result).toBe("[a-z]");
        });
    });

    describe("uppercase-letter constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("uppercase-letter"));
            expect(result).toBe("[A-Z]");
        });
    });

    describe("non-letter constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("non-letter"));
            expect(result).toBe("[^a-zA-Z]");
        });
    });

    describe("alphanumeric constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("alphanumeric"));
            expect(result).toBe("[a-zA-Z0-9]");
        });
    });

    describe("non-alphanumeric constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("non-alphanumeric"));
            expect(result).toBe("[^a-zA-Z0-9]");
        });
    });

    // Predefined Character Sets
    describe("digit constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("digit"));
            expect(result).toBe("(?:\\d)");
        });
    });

    describe("non-digit constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("non-digit"));
            expect(result).toBe("(?:\\D)");
        });
    });

    describe("whitespace constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("whitespace"));
            expect(result).toBe("(?:\\s)");
        });
    });

    describe("whitespace-block constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("whitespace-block"));
            expect(result).toBe("(?:\\s+)");
        });
    });

    describe("non-whitespace constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("non-whitespace"));
            expect(result).toBe("(?:\\S)");
        });
    });

    describe("non-newline-whitespace constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("non-newline-whitespace"));
            expect(result).toBe("[^\\n\\S]");
        });
    });

    describe("non-newline-whitespace-block constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("non-newline-whitespace-block"));
            expect(result).toBe("(?:[^\\n\\S]+)");
        });
    });

    describe("vertical-whitespace constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("vertical-whitespace"));
            expect(result).toBe("(?:\\v)");
        });
    });

    describe("word-char constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("word-char"));
            expect(result).toBe("(?:\\w)");
        });
    });

    describe("non-word-char constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("non-word-char"));
            expect(result).toBe("(?:\\W)");
        });
    });

    describe("backspace constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("backspace"));
            expect(result).toBe("[\\b]");
        });
    });

    describe("escape-bound constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("escape-bound"));
            expect(result).toBe("(?:(?<=(?<!\\\\)\\\\(?:\\\\\\\\)*))");
        });
    });

    describe("non-escape-bound constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("non-escape-bound"));
            expect(result).toBe("(?:(?<=(?<!\\\\)(?:\\\\\\\\)*))");
        });
    });

    describe("never constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("never"));
            expect(result).toBe("(?:(?!))");
        });
    });
});