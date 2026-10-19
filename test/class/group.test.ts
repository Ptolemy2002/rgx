import { RGXClassToken, RGXClassUnionToken, RGXGroupToken, rgxGroup } from "src/class";
import { RGXInvalidIdentifierError, RGXInvalidRegexLocalizableFlagsError, RGXInvalidTokenError } from "src/errors";
import { ConstructFunction } from "src/internal";

class TestClassToken1 extends RGXClassToken {
    toRgx() {
        return "test";
    }

    clone() {
        return new TestClassToken1();
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
        expect(instance.flags).toBeNull();
    });

    it("correctly initializes with only a name", () => {
        const instance = constructor({ name: "test" });
        expect(instance.name).toBe("test");
        expect(instance.capturing).toBe(true);
        expect(instance.flags).toBeNull();
    });

    it("correctly initializes with only capturing set to false", () => {
        const instance = constructor({ capturing: false });
        expect(instance.name).toBeNull();
        expect(instance.capturing).toBe(false);
        expect(instance.flags).toBeNull();
    });

    it("correctly initializes with only flags", () => {
        const instance = constructor({ flags: "i" });
        expect(instance.name).toBeNull();
        expect(instance.capturing).toBe(true);
        expect(instance.flags).toBe("i");
    });

    it("correctly initializes with only capturing set to true", () => {
        const instance = constructor({ capturing: true });
        expect(instance.name).toBeNull();
        expect(instance.capturing).toBe(true);
        expect(instance.flags).toBeNull();
    });

    it("correctly initializes with both name and capturing set to false", () => {
        const instance = constructor({ name: "test", capturing: false });
        expect(instance.name).toBeNull(); // Name should be null because non-capturing groups cannot have names
        expect(instance.capturing).toBe(false);
        expect(instance.flags).toBeNull();
    });

    it("correctly initializes with both name and capturing set to true", () => {
        const instance = constructor({ name: "test", capturing: true });
        expect(instance.name).toBe("test");
        expect(instance.capturing).toBe(true);
        expect(instance.flags).toBeNull();
    });

    it("correctly initializes with name, capturing, and flags", () => {
        const instance = constructor({ name: "test", capturing: true, flags: "i" });
        expect(instance.name).toBe("test");
        expect(instance.capturing).toBe(true);
        expect(instance.flags).toBe("i");
    });

    it("correctly initializes with a name and aliases", () => {
        const instance = constructor({ name: "test", aliases: ["a", "b"] });
        expect(instance.name).toBe("test");
        expect(instance.aliases).toEqual(["a", "b"]);
    });

    it("uses the first alias as the name when there is no name", () => {
        const instance = constructor({ aliases: ["a", "b"] });
        expect(instance.name).toBe("a");
        expect(instance.aliases).toEqual(["b"]);
    });

    it("drops aliases when capturing is false", () => {
        const instance = constructor({ name: "test", aliases: ["a"], capturing: false });
        expect(instance.name).toBeNull();
        expect(instance.aliases).toEqual([]);
    });

    it("correctly initializes with a token array", () => {
        const token = new TestClassToken1();
        const instance = constructor({}, [token]);

        expect(instance.tokens).toEqual([token]);
    });

    it("correctly initializes with a single token", () => {
        const token = new TestClassToken1();
        const instance = constructor({}, token);

        expect(instance.tokens).toEqual([token]);
    });

    it("correctly initializes with a union", () => {
        const union = new RGXClassUnionToken(["a", "b"]);
        const instance = constructor({}, union);

        // The union is kept as a single element rather than being flattened into the concat.
        expect(instance.tokens).toEqual([union]);
        expect(instance.toRgx().source).toBe("((?:a|b))");
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
            const instance = new TestClassToken1();

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


    describe("resolve", () => {
        it("resolves correctly with no name and capturing true", () => {
            const instance = new RGXGroupToken({}, [new TestClassToken1()]);
            expect(instance.resolve()).toEqual("(test)");
        });

        it("resolves correctly with a name", () => {
            const instance = new RGXGroupToken({ name: "test" }, [new TestClassToken1()]);
            expect(instance.resolve()).toEqual("(?<test>test)");
        });

        it("resolves correctly with capturing false", () => {
            const instance = new RGXGroupToken({ capturing: false }, [new TestClassToken1()]);
            expect(instance.resolve()).toEqual("(?:test)");
        });

        it("resolves correctly with a name and capturing false (name is ignored)", () => {
            const instance = new RGXGroupToken({ name: "test", capturing: false }, [new TestClassToken1()]);
            expect(instance.resolve()).toEqual("(?:test)");
        });

        it("resolves correctly with flags only", () => {
            const instance = new RGXGroupToken({ flags: "i" }, [new TestClassToken1()]);
            expect(instance.resolve()).toEqual("(?i:(test))");
        });

        it("resolves correctly with a name and flags", () => {
            const instance = new RGXGroupToken({ name: "test", flags: "i" }, [new TestClassToken1()]);
            expect(instance.resolve()).toEqual("(?i:(?<test>test))");
        });

        it("resolves correctly with aliases, nested inside the name in order", () => {
            const instance = new RGXGroupToken({ name: "test", aliases: ["a", "b"] }, [new TestClassToken1()]);
            expect(instance.resolve()).toEqual("(?<test>(?<a>(?<b>test)))");
        });

        it("resolves correctly with aliases and flags, keeping the flags outermost", () => {
            const instance = new RGXGroupToken({ name: "test", aliases: ["a"], flags: "i" }, [new TestClassToken1()]);
            expect(instance.resolve()).toEqual("(?i:(?<test>(?<a>test)))");
        });

        it("resolves correctly with capturing false and flags", () => {
            const instance = new RGXGroupToken({ capturing: false, flags: "i" }, [new TestClassToken1()]);
            expect(instance.resolve()).toEqual("(?i:test)");
        });

        it("only outputs the flags that change where the group is placed", () => {
            const instance = new RGXGroupToken({ capturing: false, flags: "i" }, [new TestClassToken1()]);
            expect(instance.toRgx("i").source).toBe("(?:test)");
            expect(instance.toRgx("ms").source).toBe("(?i-ms:test)");
            expect(new RGXGroupToken({ flags: "i" }, ["a"]).toRgx("i").source).toBe("(a)");
        });

        it("turns off every localizable flag when flags is empty", () => {
            const instance = new RGXGroupToken({ capturing: false, flags: "" }, ["a"]);
            expect(instance.toRgx("is").source).toBe("(?-is:a)");
            expect(instance.toRgx("").source).toBe("(?:a)");
        });

        it("inherits the surrounding flags when flags is null", () => {
            expect(new RGXGroupToken({ capturing: false }, ["a"]).toRgx("i").source).toBe("(?:a)");
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

    describe("aliases", () => {
        it("accepts unique valid identifiers", () => {
            const instance = new RGXGroupToken({ name: "test" });
            instance.aliases = ["a", "b"];
            expect(instance.aliases).toEqual(["a", "b"]);
            expect(instance.allNames()).toEqual(["test", "a", "b"]);
        });

        it("returns a copy that can't change the group", () => {
            const instance = new RGXGroupToken({ name: "test", aliases: ["a"] });
            instance.aliases.push("b");
            expect(instance.aliases).toEqual(["a"]);
        });

        it("rejects invalid identifiers without changing anything", () => {
            const instance = new RGXGroupToken({ name: "test", aliases: ["a"] });
            expect(() => { instance.aliases = ["b", "123invalid"]; }).toThrow(RGXInvalidIdentifierError);
            expect(instance.allNames()).toEqual(["test", "a"]);
        });

        it("rejects duplicates, including the name", () => {
            const instance = new RGXGroupToken({ name: "test" });
            expect(() => { instance.aliases = ["a", "a"]; }).toThrow(RGXInvalidIdentifierError);
            expect(() => { instance.aliases = ["test"]; }).toThrow(RGXInvalidIdentifierError);
            expect(() => new RGXGroupToken({ aliases: ["a", "a"] })).toThrow(RGXInvalidIdentifierError);
            expect(instance.aliases).toEqual([]);
        });

        it("sets the name from the first alias when there is no name", () => {
            const instance = new RGXGroupToken();
            instance.aliases = ["a", "b"];
            expect(instance.name).toBe("a");
            expect(instance.aliases).toEqual(["b"]);
        });

        it("does nothing when set to an empty list without a name", () => {
            const instance = new RGXGroupToken();
            instance.aliases = [];
            expect(instance.allNames()).toEqual([]);
        });

        it("adds aliases one at a time, starting with the name", () => {
            const instance = new RGXGroupToken();
            instance.addAlias("a");
            instance.addAlias("b");
            expect(instance.name).toBe("a");
            expect(instance.aliases).toEqual(["b"]);
            expect(() => instance.addAlias("a")).toThrow(RGXInvalidIdentifierError);
        });

        it("are cleared when the name is set to null", () => {
            const instance = new RGXGroupToken({ name: "test", aliases: ["a"] });
            instance.name = null;
            expect(instance.aliases).toEqual([]);
            expect(instance.allNames()).toEqual([]);
        });

        it("are kept when the name changes, but can't share it", () => {
            const instance = new RGXGroupToken({ name: "test", aliases: ["a"] });
            instance.name = "other";
            expect(instance.allNames()).toEqual(["other", "a"]);
            expect(() => { instance.name = "a"; }).toThrow(RGXInvalidIdentifierError);
            expect(instance.name).toBe("other");
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

    describe("flags", () => {
        it("accepts valid localizable regex flags", () => {
            const instance = new RGXGroupToken();
            expect(() => { instance.flags = "ims"; }).not.toThrow();
            expect(instance.flags).toBe("ims");
        });

        it("rejects invalid localizable regex flags", () => {
            const instance = new RGXGroupToken();
            expect(() => { instance.flags = "a"; }).toThrow(RGXInvalidRegexLocalizableFlagsError);
            expect(() => { instance.flags = "g"; }).toThrow(RGXInvalidRegexLocalizableFlagsError);
            expect(() => { instance.flags = "u"; }).toThrow(RGXInvalidRegexLocalizableFlagsError);
            expect(() => { instance.flags = "y"; }).toThrow(RGXInvalidRegexLocalizableFlagsError);
            expect(() => { instance.flags = "imsgauy"; }).toThrow(RGXInvalidRegexLocalizableFlagsError);
        });
    });

    describe("clone", () => {
        it("does nothing when depth is 0", () => {
            const token = new TestClassToken1();
            const instance = new RGXGroupToken({ name: "test", capturing: false }, [token]);
            const clone = instance.clone(0);

            expect(clone).toBe(instance);
        });

        it("preserves properties", () => {
            const token = new TestClassToken1();
            const instance = new RGXGroupToken({ name: "test", capturing: false }, [token]);
            const clone = instance.clone();
            const aliased = new RGXGroupToken({ name: "test", aliases: ["a"] }).clone();
            expect(aliased.allNames()).toEqual(["test", "a"]);

            expect(clone).not.toBe(instance);
            expect(clone.name).toBe(instance.name);
            expect(clone.capturing).toBe(instance.capturing);
            expect(clone.tokens).toEqual(instance.tokens);
        });
    });
});