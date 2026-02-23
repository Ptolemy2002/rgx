import { RGXClassToken, RGXGroupToken, rgxGroup } from "src/class";
import { RGXTokenCollection } from "src/collection";
import { RGXInvalidTokenError } from "src/errors";
import { ConstructFunction } from "src/internal";

class TestClassToken extends RGXClassToken {
    toRgx() {
        return "test";
    }
}

const isRgxGroupToken = RGXGroupToken.check;
const assertRgxGroupToken = RGXGroupToken.assert;

function constructionTest(constructor: ConstructFunction<typeof RGXGroupToken>) {
    it("constructs an instance of RGXGroupToken", () => {
        const instance = constructor();
        expect(instance).toBeInstanceOf(RGXGroupToken);
    });

    it("correctly initializes with no parameters", () => {
        const instance = constructor();
        expect(instance.name).toBeNull();
        expect(instance.capturing).toBe(true);
    });

    it("correctly initializes with only a name", () => {
        const instance = constructor({ name: "test" });
        expect(instance.name).toBe("test");
        expect(instance.capturing).toBe(true);
    });

    it("correctly initializes with only capturing set to false", () => {
        const instance = constructor({ capturing: false });
        expect(instance.name).toBeNull();
        expect(instance.capturing).toBe(false);
    });

    it("correctly initializes with only capturing set to true", () => {
        const instance = constructor({ capturing: true });
        expect(instance.name).toBeNull();
        expect(instance.capturing).toBe(true);
    });

    it("correctly initializes with both name and capturing set to false", () => {
        const instance = constructor({ name: "test", capturing: false });
        expect(instance.name).toBeNull(); // Name should be null because non-capturing groups cannot have names
        expect(instance.capturing).toBe(false);
    });

    it("correctly initializes with both name and capturing set to true", () => {
        const instance = constructor({ name: "test", capturing: true });
        expect(instance.name).toBe("test");
        expect(instance.capturing).toBe(true);
    });

    it("correctly initializes with a token array", () => {
        const token = new TestClassToken();
        const instance = constructor({}, [token]);

        expect(instance.tokens.toArray()).toEqual([token]);
    });

    it("correctly initializes with a token collection in concat mode", () => {
        const token = new TestClassToken();
        const collection = new RGXTokenCollection([token], 'concat');
        const instance = constructor({}, collection);

        expect(instance.tokens.toArray()).toEqual([token]);
    });

    it("correctly initializes with a token collection in union mode", () => {
        const token = new TestClassToken();
        const collection = new RGXTokenCollection([token], 'union');
        const instance = constructor({}, collection);

        expect(instance.tokens.toArray()).toEqual([token]);
    });
}

describe("RGXGroupToken", () => {
    describe("constructor", () => {
        constructionTest((...args) => new RGXGroupToken(...args));
    });

    describe("construct function", () => {
        constructionTest(rgxGroup);
    });

    describe("type guards", () => {
        it("accepts instances of RGXGroupToken", () => {
            const instance = new RGXGroupToken();
            expect(isRgxGroupToken(instance)).toBe(true);
            expect(() => assertRgxGroupToken(instance)).not.toThrow();
        });

        it("rejects non-instances of RGXGroupToken", () => {
            const instance = new TestClassToken();

            expect(isRgxGroupToken({})).toBe(false);
            expect(isRgxGroupToken("test")).toBe(false);
            expect(isRgxGroupToken(123)).toBe(false);
            expect(isRgxGroupToken(null)).toBe(false);
            expect(isRgxGroupToken(undefined)).toBe(false);
            expect(isRgxGroupToken(instance)).toBe(false);

            expect(() => assertRgxGroupToken({})).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxGroupToken("test")).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxGroupToken(123)).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxGroupToken(null)).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxGroupToken(undefined)).toThrow(RGXInvalidTokenError);
            expect(() => assertRgxGroupToken(instance)).toThrow(RGXInvalidTokenError);
        });
    });

    describe("isGroup", () => {
        it("is true", () => {
            const instance = new RGXGroupToken();
            expect(instance.isGroup).toBe(true);
        });
    });

    describe("resolve", () => {
        it("resolves correctly with no name and capturing true", () => {
            const instance = new RGXGroupToken({}, [new TestClassToken()]);
            expect(instance.resolve()).toEqual("(test)");
        });

        it("resolves correctly with a name", () => {
            const instance = new RGXGroupToken({ name: "test" }, [new TestClassToken()]);
            expect(instance.resolve()).toEqual("(?<test>test)");
        });

        it("resolves correctly with capturing false", () => {
            const instance = new RGXGroupToken({ capturing: false }, [new TestClassToken()]);
            expect(instance.resolve()).toEqual("(?:test)");
        });

        it("resolves correctly with a name and capturing false (name is ignored)", () => {
            const instance = new RGXGroupToken({ name: "test", capturing: false }, [new TestClassToken()]);
            expect(instance.resolve()).toEqual("(?:test)");
        });
    });

    describe("name", () => {
        it("accepts valid identifiers", () => {
            const instance = new RGXGroupToken();
            expect(() => { instance.name = "validName"; }).not.toThrow();
            expect(instance.name).toBe("validName");
        });

        it("rejects invalid identifiers", () => {
            const instance = new RGXGroupToken();
            expect(() => { instance.name = "123invalid"; }).toThrow();
            expect(() => { instance.name = "invalid-name"; }).toThrow();
            expect(() => { instance.name = "invalid name"; }).toThrow();
            expect(() => { instance.name = ""; }).toThrow();
        });
    });

    describe("capturing", () => {
        it("sets name to null when set to false", () => {
            const instance = new RGXGroupToken({ name: "test" });
            instance.capturing = false;
            expect(instance.capturing).toBe(false);
            expect(instance.name).toBeNull();
        });

        it("does not set name to null when set to true", () => {
            const instance = new RGXGroupToken({ name: "test" });
            instance._capturing = false; // Forcefully set internal capturing value to false
            instance.capturing = true;
            expect(instance.capturing).toBe(true);
            expect(instance.name).toBe("test");
        });

        it("is true if the internal value is false but there is a name", () => {
            const instance = new RGXGroupToken({ name: "test" });
            instance._capturing = false; // Forcefully set internal capturing value to false
            expect(instance.capturing).toBe(true);
        });
    });
});