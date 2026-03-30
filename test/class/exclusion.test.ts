import { rgxExclusion, RGXClassToken, RGXClassUnionToken, RGXExclusionToken } from "src/class";
import { RGXInvalidIdentifierError, RGXInvalidTokenError } from "src/errors";
import { ConstructFunction } from "src/internal";

class TestClassToken extends RGXClassToken {
    toRgx() {
        return "test";
    }

    clone() {
        return new TestClassToken();
    }
}

const isRGXExclusionToken = RGXExclusionToken.check;
const assertRGXExclusionToken = RGXExclusionToken.assert;

function constructionTest(constructor: ConstructFunction<typeof RGXExclusionToken>) {
    it("constructs an instance of RGXExclusionToken", () => {
        const instance = constructor("exclusionId", new TestClassToken());
        expect(instance).toBeInstanceOf(RGXExclusionToken);
    });

    it("correctly initializes with just an id and token", () => {
        const token = new TestClassToken();
        const instance = constructor("exclusionId", token);

        expect(instance.exclusionId).toBe("exclusionId");
        expect(instance.token).toBe(token);
        expect(instance.exclusions).toBeInstanceOf(RGXClassUnionToken);
        expect(instance.exclusions.resolve()).toBe("(?:(?:))");
        expect(instance.terminal).toBeNull();
    });

    it("correctly throws with an invalid exclusionId", () => {
        expect(() => constructor("invalid id", new TestClassToken())).toThrow(RGXInvalidIdentifierError);
    });

    it("correctly initializes with exclusions and terminal", () => {
        const token = new TestClassToken();
        const exclusion1 = new TestClassToken();
        const exclusion2 = new TestClassToken();
        const terminal = new TestClassToken();

        const instance = constructor("exclusionId", token, [exclusion1, exclusion2], terminal);

        expect(instance.exclusionId).toBe("exclusionId");
        expect(instance.token).toBe(token);
        expect(instance.exclusions).toBeInstanceOf(RGXClassUnionToken);
        expect(instance.exclusions.resolve()).toBe("(?:test|test)");
        expect(instance.terminal).toBe(terminal);
    });
}

describe("RGXExclusionToken", () => {
    describe("type guards", () => {
        it("accepts instances of RGXExclusionToken", () => {
            const instance = new RGXExclusionToken("exclusionId", new TestClassToken());
            expect(isRGXExclusionToken(instance)).toBe(true);
        });

        it("rejects non-instances of RGXExclusionToken", () => {
            const instance = new TestClassToken();

            expect(isRGXExclusionToken({})).toBe(false);
            expect(isRGXExclusionToken("test")).toBe(false);
            expect(isRGXExclusionToken(123)).toBe(false);
            expect(isRGXExclusionToken(null)).toBe(false);
            expect(isRGXExclusionToken(undefined)).toBe(false);
            expect(isRGXExclusionToken(instance)).toBe(false);

            expect(() => assertRGXExclusionToken({})).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXExclusionToken("test")).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXExclusionToken(123)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXExclusionToken(null)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXExclusionToken(undefined)).toThrow(RGXInvalidTokenError);
            expect(() => assertRGXExclusionToken(instance)).toThrow(RGXInvalidTokenError);
        });
    });

    describe("constructor", () => {
        constructionTest((...args) => new RGXExclusionToken(...args));
    });

    describe("construct function", () => {
        constructionTest(rgxExclusion);
    });

    describe("exclusionId", () => {
        it("accepts valid identifiers", () => {
            const instance = new RGXExclusionToken("initial_id", new TestClassToken());
            expect(() => instance.exclusionId = "valid_id").not.toThrow();
            expect(instance.exclusionId).toBe("valid_id");
        });

        it("rejects invalid identifiers", () => {
            const instance = new RGXExclusionToken("initial_id", new TestClassToken());
            expect(() => { instance.exclusionId = "123invalid"; }).toThrow();
            expect(() => { instance.exclusionId = "invalid-name"; }).toThrow();
            expect(() => { instance.exclusionId = "invalid name"; }).toThrow();
            expect(() => { instance.exclusionId = ""; }).toThrow();
        });
    });

    it("resolves correctly with terminal", () => {
        const result = new RGXExclusionToken("exclusionId", /\b\w+/, [new TestClassToken()], /\b/).resolve();
        expect(result).toBe("(?:(?=(?<exclusionId>(?:\\b\\w+)(?:\\b)))(?!(?:test)(?:\\b))\\k<exclusionId>)");
    });

    it("resolves correctly without terminal", () => {
        const result = new RGXExclusionToken("exclusionId", /\b\w+/, [new TestClassToken()]).resolve();
        expect(result).toBe("(?:(?=(?<exclusionId>(?:\\b\\w+)))(?!(?:test))\\k<exclusionId>)");
    });

    describe("clone", () => {
        it("does nothing with depth 0", () => {
            const instance = new RGXExclusionToken("exclusionId", new TestClassToken(), [new TestClassToken()], new TestClassToken());
            const clone = instance.clone(0);
            expect(clone).toBe(instance);
        });

        it("preserves properties", () => {
            const instance = new RGXExclusionToken("exclusionId", "token", ["exclusion1", "exclusion2"], "terminal");
            const clone = instance.clone();

            expect(clone).not.toBe(instance);
            expect(clone.exclusionId).toBe(instance.exclusionId);
            expect(clone.token).toBe(instance.token);
            expect(clone.exclusions).not.toBe(instance.exclusions);
            expect(clone.exclusions.resolve()).toBe(instance.exclusions.resolve());
            expect(clone.terminal).toBe(instance.terminal);
        });
    });
});