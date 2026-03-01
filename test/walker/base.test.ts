import { RGXPart, rgxWalker, RGXWalker } from "src/walker";
import { RGXTokenCollection } from "src/collection";
import { RGXInvalidTokenError, RGXOutOfBoundsError, RGXRegexNotMatchedAtPositionError } from "src/errors";
import { RGXClassToken } from "src/class";

export class TestClassToken1 extends RGXClassToken {
    toRgx() {
        return "test";
    }

    clone() {
        return new TestClassToken1();
    }
}

function constructorTest(constructor: typeof rgxWalker) {
    it("constructs an instance of RGXWalker", () => {
        const instance = constructor("test", []);
        expect(instance).toBeInstanceOf(RGXWalker);
    });

    it("correctly initializes with a source and token array", () => {
        const source = "test";
        const tokens = ["t", "e", "s", "t"];
        const instance = constructor(source, tokens);
        expect(instance.source).toBe(source);
        expect(instance.tokens.toArray()).toEqual(tokens);
    });

    it("correctly initializes with a source and a token collection in concat mode", () => {
        const source = "test";
        const token = "test";
        const collection = new RGXTokenCollection([token], 'concat');

        const instance = constructor(source, collection);
        expect(instance.source).toBe(source);
        expect(instance.tokens.toArray()).toEqual([token]);
    });

    it("correctly initializes with a source and a token collection in union mode", () => {
        const source = "test";
        const token = "test";
        const collection = new RGXTokenCollection([token], 'union');

        const instance = constructor(source, collection);
        expect(instance.source).toBe(source);
        expect(instance.tokens.toArray()).toEqual([token]);
    });

    it("correctly initializes with options", () => {
        const source = "test";
        const tokens = ["t", "e", "s", "t"];
        const options = { startingSourcePosition: 2, reduced: "reduced" };
        const instance = constructor(source, tokens, options);

        expect(instance.sourcePosition).toBe(options.startingSourcePosition);
        expect(instance.reduced).toBe(options.reduced);
    });
}

const isRGXWalker = RGXWalker.check;
const assertIsRGXWalker = RGXWalker.assert;

describe("RGXWalker", () => {
    describe("constructor", () => {
        constructorTest((...args) => new RGXWalker(...args));
    });

    describe("construct function", () => {
        constructorTest(rgxWalker);
    });

    describe("class guards", () => {
        it("accepts instances of RGXWalker", () => {
            const instance = new RGXWalker("test", []);
            expect(isRGXWalker(instance)).toBe(true);
            expect(() => assertIsRGXWalker(instance)).not.toThrow();
        });

        it("rejects non-instances of RGXWalker", () => {
            const instance = new TestClassToken1();

            expect(isRGXWalker({})).toBe(false);
            expect(isRGXWalker("test")).toBe(false);
            expect(isRGXWalker(123)).toBe(false);
            expect(isRGXWalker(null)).toBe(false);
            expect(isRGXWalker(undefined)).toBe(false);
            expect(isRGXWalker(instance)).toBe(false);

            expect(() => assertIsRGXWalker({})).toThrow(RGXInvalidTokenError);
            expect(() => assertIsRGXWalker("test")).toThrow(RGXInvalidTokenError);
            expect(() => assertIsRGXWalker(123)).toThrow(RGXInvalidTokenError);
            expect(() => assertIsRGXWalker(null)).toThrow(RGXInvalidTokenError);
            expect(() => assertIsRGXWalker(undefined)).toThrow(RGXInvalidTokenError);
            expect(() => assertIsRGXWalker(instance)).toThrow(RGXInvalidTokenError);
        });
    });

    describe("sourcePosition", () => {
        it("throws if set to a negative value", () => {
            const instance = new RGXWalker("test", []);
            expect(() => instance.sourcePosition = -1).toThrow(RGXOutOfBoundsError);
        });

        it("throws if set to a value greater than the source length", () => {
            const instance = new RGXWalker("test", []);
            expect(() => instance.sourcePosition = 5).toThrow(RGXOutOfBoundsError);
        });

        // Unlike the original, source.length IS valid (represents "fully consumed")
        it("accepts source.length (fully consumed position)", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 4;
            expect(instance.sourcePosition).toBe(4);
        });

        it("accepts valid values", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 0;
            expect(instance.sourcePosition).toBe(0);

            instance.sourcePosition = 3;
            expect(instance.sourcePosition).toBe(3);
        });
    });

    describe("tokenPosition", () => {
        it("throws if set to a negative value", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            expect(() => instance.tokenPosition = -1).toThrow(RGXOutOfBoundsError);
        });

        it("throws if set to a value greater than the token collection length", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            expect(() => instance.tokenPosition = 5).toThrow(RGXOutOfBoundsError);
        });

        it("accepts valid values", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            expect(() => instance.tokenPosition = 0).not.toThrow();
            expect(() => instance.tokenPosition = 4).not.toThrow();
        });
    });

    describe("stopped", () => {
        it("is false initially", () => {
            const instance = new RGXWalker("test", []);
            expect(instance.stopped).toBe(false);
        });

        it("is true after calling stop()", () => {
            const instance = new RGXWalker("test", []);
            instance.stop();
            expect(instance.stopped).toBe(true);
        });
    });

    describe("atTokenEnd", () => {
        it("returns true if tokenPosition is equal to tokens length", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            instance.tokenPosition = 4;
            expect(instance.atTokenEnd()).toBe(true);
        });

        it("returns false if tokenPosition is less than tokens length", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            instance.tokenPosition = 3;
            expect(instance.atTokenEnd()).toBe(false);
        });
    });

    describe("hasNextToken", () => {
        it("returns false if atTokenEnd is true", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            instance.tokenPosition = 4;
            expect(instance.hasNextToken()).toBe(false);
        });

        it("returns true if atTokenEnd is false and predicate returns true", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            instance.tokenPosition = 3;
            expect(instance.hasNextToken(() => true)).toBe(true);
        });

        it("returns false if atTokenEnd is false but predicate returns false", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            instance.tokenPosition = 3;
            expect(instance.hasNextToken(() => false)).toBe(false);
        });
    });

    describe("atSourceEnd", () => {
        it("returns true if sourcePosition is at source.length", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 4;
            expect(instance.atSourceEnd()).toBe(true);
        });

        it("returns false if sourcePosition is at the last character", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 3;
            expect(instance.atSourceEnd()).toBe(false);
        });

        it("returns false at position 0", () => {
            const instance = new RGXWalker("test", []);
            expect(instance.atSourceEnd()).toBe(false);
        });
    });

    describe("hasNextSource", () => {
        it("returns false if atSourceEnd is true", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 4;
            expect(instance.hasNextSource()).toBe(false);
        });

        it("returns true if atSourceEnd is false and predicate returns true", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 2;
            expect(instance.hasNextSource(() => true)).toBe(true);
        });

        it("returns false if atSourceEnd is false but predicate returns false", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 2;
            expect(instance.hasNextSource(() => false)).toBe(false);
        });

        it("does not call predicate if atSourceEnd is true", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 4;
            const predicate = jest.fn();
            instance.hasNextSource(predicate);
            expect(predicate).not.toHaveBeenCalled();
        });

        it("calls predicate with the remaining source if atSourceEnd is false", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 2;
            const predicate = jest.fn();
            instance.hasNextSource(predicate);
            expect(predicate).toHaveBeenCalledWith("st");
        });

        it("has a default predicate that always returns true", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 2;
            expect(instance.hasNextSource()).toBe(true);
        });
    });

    describe("lastCapture", () => {
        it("returns null if there are no captures", () => {
            const instance = new RGXWalker("test", []);
            expect(instance.lastCapture()).toBe(null);
        });

        it("returns the last capture", () => {
            const instance = new RGXWalker("test", []);
            instance.captures.push({ raw: "first", value: "first" });
            instance.captures.push({ raw: "second", value: "second" });
            expect(instance.lastCapture()).toEqual({ raw: "second", value: "second" });
        });
    });

    describe("currentToken", () => {
        it("returns null if atTokenEnd is true", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            instance.tokenPosition = 4;
            expect(instance.currentToken()).toBe(null);
        });

        it("returns the token at the current position", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            instance.tokenPosition = 2;
            expect(instance.currentToken()).toBe("s");
        });
    });

    describe("remainingSource", () => {
        it("returns null if atSourceEnd is true", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 4;
            expect(instance.remainingSource()).toBe(null);
        });

        // Unlike the original, position at last char still returns the last char
        it("returns the last character at the last position", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 3;
            expect(instance.remainingSource()).toBe("t");
        });

        it("returns the remaining source", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 2;
            expect(instance.remainingSource()).toBe("st");
        });
    });

    describe("capture", () => {
        it("captures the string matched by the token", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            const captured = instance.capture("t");
            expect(captured).toBe("t");
        });

        it("advances the source position by the length of the captured string", () => {
            const instance = new RGXWalker("test", ["te", "st"]);
            instance.capture("te");
            expect(instance.sourcePosition).toBe(2);
        });

        it("advances source position to source.length when match reaches the end", () => {
            const instance = new RGXWalker("test", ["test"]);
            instance.capture("test");
            expect(instance.sourcePosition).toBe(4);
            expect(instance.atSourceEnd()).toBe(true);
        });

        it("throws if the token does not match the source at the current position", () => {
            const instance = new RGXWalker("test", ["x"]);
            expect(() => instance.capture("x")).toThrow(RGXRegexNotMatchedAtPositionError);
        });
    });

    describe("step", () => {
        it("returns null if there are no more tokens", () => {
            const instance = new RGXWalker("test", ["t"]);
            instance.tokenPosition = 1;
            expect(instance.step()).toBe(null);
        });

        it("returns a capture result for plain tokens", () => {
            const instance = new RGXWalker("test", ["t", "e"]);
            const result = instance.step();
            expect(result).toEqual({ raw: "t", value: "t" });
        });

        it("adds to captures for plain tokens", () => {
            const instance = new RGXWalker("test", ["t"]);
            instance.step();
            expect(instance.captures).toEqual([{ raw: "t", value: "t" }]);
        });

        it("advances tokenPosition", () => {
            const instance = new RGXWalker("test", ["t", "e"]);
            instance.step();
            expect(instance.tokenPosition).toBe(1);
        });

        it("calls beforeCapture on Parts", () => {
            const beforeCapture = jest.fn();
            const part = new RGXPart("test", { beforeCapture });
            const instance = new RGXWalker("test", [part]);

            instance.step();
            expect(beforeCapture).toHaveBeenCalledWith(part, instance);
        });

        it("calls afterCapture on Parts with the capture result", () => {
            const afterCapture = jest.fn();
            const part = new RGXPart("test", { afterCapture });
            const instance = new RGXWalker("test", [part]);

            instance.step();
            expect(afterCapture).toHaveBeenCalledWith(
                { raw: "test", value: "test" },
                part,
                instance
            );
        });

        it("applies the Part transform to the value", () => {
            const part = new RGXPart("test", { transform: s => s.toUpperCase() });
            const instance = new RGXWalker("test", [part]);

            const result = instance.step();
            expect(result).toEqual({ raw: "test", value: "TEST" });
        });

        describe("beforeCapture returns 'skip'", () => {
            it("skips the token without capturing", () => {
                const part = new RGXPart("t", { beforeCapture: () => "skip" });
                const instance = new RGXWalker("test", [part, "t"]);

                const result = instance.step();
                expect(result).toBe(null);
                // Token position advances past the skipped Part
                expect(instance.tokenPosition).toBe(1);
                // Source position does NOT advance
                expect(instance.sourcePosition).toBe(0);
                // No capture recorded
                expect(instance.captures).toEqual([]);
            });
        });

        describe("beforeCapture returns 'stop'", () => {
            it("sets stopped and returns null without advancing", () => {
                const part = new RGXPart("t", { beforeCapture: () => "stop" });
                const instance = new RGXWalker("test", [part]);

                const result = instance.step();
                expect(result).toBe(null);
                expect(instance.stopped).toBe(true);
                // Neither position advances
                expect(instance.tokenPosition).toBe(0);
                expect(instance.sourcePosition).toBe(0);
            });
        });

        describe("beforeCapture returns 'silent'", () => {
            it("captures but does not record in captures array", () => {
                const part = new RGXPart("t", { beforeCapture: () => "silent" });
                const instance = new RGXWalker("test", [part]);

                const result = instance.step();
                // Still returns the capture result
                expect(result).toEqual({ raw: "t", value: "t" });
                // But NOT added to captures
                expect(instance.captures).toEqual([]);
                // Positions advance normally
                expect(instance.tokenPosition).toBe(1);
                expect(instance.sourcePosition).toBe(1);
            });

            it("still calls afterCapture", () => {
                const afterCapture = jest.fn();
                const part = new RGXPart("t", { beforeCapture: () => "silent", afterCapture });
                const instance = new RGXWalker("test", [part]);

                instance.step();
                expect(afterCapture).toHaveBeenCalled();
            });
        });

        describe("afterCapture calls stop()", () => {
            it("sets stopped after capturing", () => {
                const part = new RGXPart("t", {
                    afterCapture: (_, __, walker) => walker.stop()
                });
                const instance = new RGXWalker("test", [part]);

                const result = instance.step();
                expect(result).toEqual({ raw: "t", value: "t" });
                expect(instance.stopped).toBe(true);
                // Token was captured and position advanced
                expect(instance.tokenPosition).toBe(1);
                expect(instance.captures).toHaveLength(1);
            });
        });
    });

    describe("stepToToken", () => {
        it("steps through tokens until the predicate returns true", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            const predicate = jest.fn(token => token === "s");

            instance.stepToToken(predicate);

            expect(predicate).toHaveBeenCalledWith("t");
            expect(predicate).toHaveBeenCalledWith("e");
            expect(predicate).toHaveBeenCalledWith("s");
            expect(instance.tokenPosition).toBe(2);
        });

        it("stops stepping if a Part's afterCapture calls stop()", () => {
            const instance = new RGXWalker("test", [
                "t",
                new RGXPart("e", {
                    afterCapture: (_, __, walker) => walker.stop()
                }),
                "s",
                "t"
            ]);

            instance.stepToToken(() => false);

            expect(instance.tokenPosition).toBe(2);
            expect(instance.captures).toHaveLength(2);
        });

        it("stops stepping if a Part's beforeCapture returns 'stop'", () => {
            const instance = new RGXWalker("test", [
                "t",
                new RGXPart("e", { beforeCapture: () => "stop" }),
                "s",
                "t"
            ]);

            instance.stepToToken(() => false);

            // "t" is captured, then Part returns "stop" — walker halts at the Part
            expect(instance.tokenPosition).toBe(1);
            expect(instance.captures).toHaveLength(1);
        });

        it("resets stopped flag on each iteration", () => {
            // A Part that skips (not stops) should not interfere with subsequent tokens.
            const instance = new RGXWalker("test", [
                new RGXPart("t", { beforeCapture: () => "skip" }),
                "t",
                "e",
                "s",
                "t"
            ]);

            instance.stepToToken(() => false);

            // The Part was skipped, then all remaining tokens matched
            expect(instance.tokenPosition).toBe(5);
        });
    });

    describe("stepToPart", () => {
        it("has a default predicate that always returns true", () => {
            const part1 = new RGXPart("e");
            const part2 = new RGXPart("s");
            const instance = new RGXWalker("test", ["t", part1, part2, "t"]);

            instance.stepToPart();
            expect(instance.tokenPosition).toBe(1);

            instance.stepToPart();
            expect(instance.tokenPosition).toBe(2);
        });

        it("steps through tokens until the predicate returns true for a part", () => {
            const part1 = new RGXPart("e");
            const part2 = new RGXPart("s");
            const instance = new RGXWalker("test", ["t", part1, part2, "t"]);
            const predicate = jest.fn(part => part === part2);

            instance.stepToPart(predicate);

            expect(predicate).toHaveBeenCalledWith(part1);
            expect(predicate).toHaveBeenCalledWith(part2);
            expect(instance.tokenPosition).toBe(2);
        });

        it("stops if the initial Part step triggers stop via afterCapture", () => {
            const part1 = new RGXPart("e", {
                afterCapture: (_, __, walker) => walker.stop()
            });
            const part2 = new RGXPart("s");
            const instance = new RGXWalker("test", ["t", part1, part2, "t"]);

            instance.tokenPosition = 1;
            instance.sourcePosition = 1;
            instance.stepToPart(() => false);

            expect(instance.tokenPosition).toBe(2);
        });
    });

    describe("walk", () => {
        it("steps through all tokens until the end", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            instance.walk();
            expect(instance.tokenPosition).toBe(4);
        });

        it("populates captures for all tokens", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            instance.walk();
            expect(instance.captures).toEqual([
                { raw: "t", value: "t" },
                { raw: "e", value: "e" },
                { raw: "s", value: "s" },
                { raw: "t", value: "t" },
            ]);
        });

        it("applies transforms for Parts", () => {
            const part = new RGXPart("es", { transform: s => s.toUpperCase() });
            const instance = new RGXWalker("test", ["t", part, "t"]);
            instance.walk();
            expect(instance.captures).toEqual([
                { raw: "t", value: "t" },
                { raw: "es", value: "ES" },
                { raw: "t", value: "t" },
            ]);
        });
    });

    describe("toRgx", () => {
        it("returns the token collection", () => {
            const source = "test";
            const tokens = ["t", "e", "s", "t"];
            const instance = rgxWalker(source, tokens);
            expect(instance.toRgx()).toBe(instance.tokens);
        });
    });

    describe("clone", () => {
        it("does nothing when depth is 0", () => {
            const source = "test";
            const tokens = ["t", "e", "s", "t"];
            const instance = rgxWalker(source, tokens);
            expect(instance.clone(0)).toBe(instance);
        });

        it("preserves properties", () => {
            const source = "test";
            const tokens = ["t", "e", "s", "t"];
            const options = { startingSourcePosition: 2, reduced: "reduced" };
            const instance = rgxWalker(source, tokens, options);
            const clone = instance.clone();

            expect(clone).not.toBe(instance);

            expect(clone.stopped).toEqual(instance.stopped);

            expect(clone.source).toBe(instance.source);
            expect(clone.sourcePosition).toBe(instance.sourcePosition);

            expect(clone.tokens).toEqual(instance.tokens);
            expect(clone.tokenPosition).toBe(instance.tokenPosition);

            expect(clone.reduced).toEqual(instance.reduced);

            expect(clone.captures).toEqual(instance.captures);
        });
    });

});