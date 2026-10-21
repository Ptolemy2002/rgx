import { RGXClassToken, RGXClassWrapperToken, RGXConstantToken } from "src/class";
import { defineRGXConstant, deleteRGXConstant, rgxConstant, rgxConstantValue } from "src/constants";
import { RGXInsertionRejectedError, RGXInvalidConstantKeyError, RGXInvalidTokenError } from "src/errors";
import { resolveRGXToken } from "src/resolve";
import { rgxa } from "src/index";
import { RGXInsertionContext } from "src/types";

class StartOnlyToken extends RGXClassToken {
    get rgxIsRepeatable() {
        return false;
    }

    rgxAcceptInsertion(context: RGXInsertionContext) {
        return context.index === 0 || "must be first";
    }

    toRgx() {
        return "x";
    }

    clone() {
        return new StartOnlyToken();
    }
}

const isRGXConstantToken = RGXConstantToken.check;
const assertRGXConstantToken = RGXConstantToken.assert;

describe("RGXConstantToken", () => {
    afterEach(() => {
        for (const name of ["test-ref", "test-start-only"]) {
            try { deleteRGXConstant(name); } catch {}
        }
    });

    describe("constructor", () => {
        it("stores the name and cache setting", () => {
            const instance = new RGXConstantToken("digit");
            expect(instance.name).toBe("digit");
            expect(instance.cache).toBe(false);
            expect(new RGXConstantToken("digit", true).cache).toBe(true);
        });

        it("doesn't require the constant to exist", () => {
            expect(() => new RGXConstantToken("non-existing-constant")).not.toThrow();
        });
    });

    describe("type guards", () => {
        it("accepts instances of RGXConstantToken", () => {
            const instance = rgxConstant("digit");
            expect(isRGXConstantToken(instance)).toBe(true);
            expect(() => assertRGXConstantToken(instance)).not.toThrow();
        });

        it("rejects non-instances of RGXConstantToken", () => {
            expect(isRGXConstantToken(rgxConstantValue("digit"))).toBe(false);
            expect(isRGXConstantToken("digit")).toBe(false);
            expect(() => assertRGXConstantToken(rgxConstantValue("digit"))).toThrow(RGXInvalidTokenError);
        });
    });

    describe("getConstant", () => {
        it("looks the constant up every time without caching", () => {
            defineRGXConstant("test-ref", "a");
            const reference = rgxConstant("test-ref");
            expect(resolveRGXToken(reference)).toBe("a");

            deleteRGXConstant("test-ref");
            defineRGXConstant("test-ref", "b");
            expect(reference.getConstant()).toBe(rgxConstantValue("test-ref"));
            expect(resolveRGXToken(reference)).toBe("b");

            deleteRGXConstant("test-ref");
            expect(() => reference.getConstant()).toThrow(RGXInvalidConstantKeyError);
        });

        it("keeps the first lookup with caching", () => {
            defineRGXConstant("test-ref", "a");
            const reference = rgxConstant("test-ref", true);
            const value = reference.getConstant();

            deleteRGXConstant("test-ref");
            expect(reference.getConstant()).toBe(value);
            expect(resolveRGXToken(reference)).toBe("a");

            defineRGXConstant("test-ref", "b");
            reference.clearCache();
            expect(resolveRGXToken(reference)).toBe("b");
        });

        it("clears the cache when the name changes or caching is turned off", () => {
            defineRGXConstant("test-ref", "a");
            const reference = rgxConstant("test-ref", true);
            reference.getConstant();

            reference.name = "digit";
            expect(reference.getConstant()).toBe(rgxConstantValue("digit"));

            reference.name = "test-ref";
            reference.getConstant();
            reference.cache = false;
            deleteRGXConstant("test-ref");
            expect(() => reference.getConstant()).toThrow(RGXInvalidConstantKeyError);

            reference.cache = true;
            expect(reference.cache).toBe(true);
        });
    });

    describe("resolution", () => {
        it("resolves like the constant", () => {
            expect(resolveRGXToken(rgxConstant("digit"))).toBe(resolveRGXToken(rgxConstantValue("digit")));
            expect(rgxa([rgxConstant("digit").repeat(2)]).source).toBe("\\d{2}");
            expect(rgxConstant("digit").toRgx()).toBe(rgxConstantValue("digit"));
        });

        it("takes on the constant's repeatability and insertion rules", () => {
            defineRGXConstant("test-start-only", new StartOnlyToken());
            const reference = rgxConstant("test-start-only");
            expect(reference.rgxIsRepeatable).toBe(false);
            expect(rgxConstant("digit").rgxIsRepeatable).toBe(rgxConstantValue("digit").rgxIsRepeatable);

            expect(rgxa([reference, "y"]).source).toBe("xy");
            expect(() => rgxa(["y", reference])).toThrow(RGXInsertionRejectedError);
        });
    });

    describe("clone", () => {
        it("returns the same instance when depth is 0", () => {
            const instance = rgxConstant("digit");
            expect(instance.clone(0)).toBe(instance);
        });

        it("creates a new reference with the same name and cache setting", () => {
            const original = rgxConstant("digit", true);
            const clone = original.clone();
            expect(clone).not.toBe(original);
            expect(clone).toBeInstanceOf(RGXConstantToken);
            expect(clone.name).toBe("digit");
            expect(clone.cache).toBe(true);
        });
    });

    describe("constants defined as native tokens", () => {
        it("resolve through their stored wrapper", () => {
            expect(rgxConstant("newline").getConstant()).toBeInstanceOf(RGXClassWrapperToken);
            expect(resolveRGXToken(rgxConstant("newline"))).toBe("\n");
        });
    });
});
