import { rgxConstant, listRGXConstants, hasRGXConstant, assertHasRGXConstant, assertNotHasRGXConstant, defineRGXConstant, deleteRGXConstant } from "src/constants";
import { RGXConstantConflictError, RGXInvalidConstantKeyError } from "src/errors";
import { resolveRGXToken } from "src/resolve";

const expectedConstantNames = [
    "newline",
    "carriage-return",
    "tab",
    "null",
    "form-feed",
    "any",
    "start",
    "end",
    "word-bound",
    "non-word-bound",
    "word-bound-start",
    "word-bound-end",
    "letter",
    "lowercase-letter",
    "uppercase-letter",
    "non-letter",
    "alphanumeric",
    "non-alphanumeric",
    "digit",
    "non-digit",
    "whitespace",
    "non-whitespace",
    "vertical-whitespace",
    "word-char",
    "non-word-char",
    "backspace"
];

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
        const value = "value";

        expect(() => defineRGXConstant(name, value)).not.toThrow();
        expect(rgxConstant(name)).toBe(value);
        deleteRGXConstant(name);
    });

    it("throws an error when defining a constant with an existing name", () => {
        const name = expectedConstantNames[0]!;
        expect(() => defineRGXConstant(name, "new value")).toThrow(RGXConstantConflictError);
    });
});

describe("deleteRGXConstant", () => {
    it("deletes an existing constant", () => {
        const name = expectedConstantNames[0]!;
        const prevToken = rgxConstant(name);
        deleteRGXConstant(name);

        expect(() => rgxConstant(name)).toThrow(RGXInvalidConstantKeyError);

        // Restore the constant for other tests
        defineRGXConstant(name, prevToken);
    });

    it("throws an error when deleting a non-existing constant", () => {
        expect(() => deleteRGXConstant("non-existing-constant")).toThrow(RGXInvalidConstantKeyError);
    });
});

describe("rgxConstant", () => {
    it("returns a truthy value for existing constants", () => {
        for (const name of expectedConstantNames) {
            const value = rgxConstant(name);
            expect(value).toBeTruthy();
        }
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
            expect(result).toBe(".");
        });
    });

    describe("start constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("start"));
            expect(result).toBe("^");
        });
    });

    describe("end constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("end"));
            expect(result).toBe("$");
        });
    });

    describe("word-bound constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("word-bound"));
            expect(result).toBe("\\b");
        });
    });

    describe("non-word-bound constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("non-word-bound"));
            expect(result).toBe("\\B");
        });
    });

    describe("word-bound-start constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("word-bound-start"));
            expect(result).toBe("(?<=\\W)(?=\\w)");
        });
    });

    describe("word-bound-end constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("word-bound-end"));
            expect(result).toBe("(?<=\\w)(?=\\W)");
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
            expect(result).toBe("\\d");
        });
    });

    describe("non-digit constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("non-digit"));
            expect(result).toBe("\\D");
        });
    });

    describe("whitespace constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("whitespace"));
            expect(result).toBe("\\s");
        });
    });

    describe("non-whitespace constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("non-whitespace"));
            expect(result).toBe("\\S");
        });
    });

    describe("vertical-whitespace constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("vertical-whitespace"));
            expect(result).toBe("\\v");
        });
    });

    describe("word-char constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("word-char"));
            expect(result).toBe("\\w");
        });
    });

    describe("non-word-char constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("non-word-char"));
            expect(result).toBe("\\W");
        });
    });

    describe("backspace constant", () => {
        it("resolves correctly", () => {
            const result = resolveRGXToken(rgxConstant("backspace"));
            expect(result).toBe("[\\b]");
        });
    });
});