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
        const options = { startingSourcePosition: 2, reducedCurrent: "reduced" };
        const instance = constructor(source, tokens, options);

        expect(instance.sourcePosition).toBe(options.startingSourcePosition);
        expect(instance.reducedCurrent).toBe(options.reducedCurrent);
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

        it("throws if set to a value equal to the source length", () => {
            const instance = new RGXWalker("test", []);
            expect(() => instance.sourcePosition = 4).toThrow(RGXOutOfBoundsError);
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

    describe("resetFlags", () => {
        it("resets all flags to false", () => {
            const instance = new RGXWalker("test", []);
            instance.flags.stopped = true;
            instance.flags.skipped = true;
            instance.flags.nonCapture = true;

            instance.resetFlags();

            expect(instance.flags.stopped).toBe(false);
            expect(instance.flags.skipped).toBe(false);
            expect(instance.flags.nonCapture).toBe(false);
        });
    });

    describe("stop", () => {
        it("sets the stopped flag to true", () => {
            const instance = new RGXWalker("test", []);
            instance.stop();
            expect(instance.flags.stopped).toBe(true);
        });
    });

    describe("skip", () => {
        it("sets the skipped flag to true", () => {
            const instance = new RGXWalker("test", []);
            instance.skip();
            expect(instance.flags.skipped).toBe(true);
        });
    });

    describe("preventCapture", () => {
        it("sets the nonCapture flag to true", () => {
            const instance = new RGXWalker("test", []);
            instance.preventCapture();
            expect(instance.flags.nonCapture).toBe(true);
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
        it("returns true if sourcePosition is greater than or equal to source length - 1", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 3;
            expect(instance.atSourceEnd()).toBe(true);
        });

        it("returns false if sourcePosition is less than source length - 1", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 2;
            expect(instance.atSourceEnd()).toBe(false);
        });
    });

    describe("hasNextSource", () => {
        it("returns false if atSourceEnd is true", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 3;
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
            instance.sourcePosition = 3;
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

    describe("hasCapturedStrings", () => {
        it("returns true if capturedStrings length is greater than or equal to minCount", () => {
            const instance = new RGXWalker("test", []);
            instance.capturedStrings.push("captured");
            expect(instance.hasCapturedStrings()).toBe(true);
            expect(instance.hasCapturedStrings(1)).toBe(true);
            expect(instance.hasCapturedStrings(0)).toBe(true);
        });

        it("returns false if capturedStrings length is less than minCount", () => {
            const instance = new RGXWalker("test", []);
            expect(instance.hasCapturedStrings()).toBe(false);
            expect(instance.hasCapturedStrings(1)).toBe(false);
        });
    });

    describe("getLastCapturedString", () => {
        it("returns null if there are no captured strings", () => {
            const instance = new RGXWalker("test", []);
            expect(instance.getLastCapturedString()).toBe(null);
        });

        it("returns the last captured string if there are captured strings", () => {
            const instance = new RGXWalker("test", []);
            instance.capturedStrings.push("first");
            instance.capturedStrings.push("second");
            expect(instance.getLastCapturedString()).toBe("second");
        });
    });

    describe("nextToken", () => {
        it("returns null if atTokenEnd is true", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            instance.tokenPosition = 4;
            expect(instance.nextToken()).toBe(null);
        });

        it("returns the next token if atTokenEnd is false", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            instance.tokenPosition = 2;
            expect(instance.nextToken()).toBe("s");
        });
    });

    describe("remainingSource", () => {
        it("returns null if atSourceEnd is true", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 3;
            expect(instance.remainingSource()).toBe(null);
        });

        it("returns the remaining source if atSourceEnd is false", () => {
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

        it("throws if the token does not match the source at the current position", () => {
            const instance = new RGXWalker("test", ["x"]);
            expect(() => instance.capture("x")).toThrow(RGXRegexNotMatchedAtPositionError);
        });

        it("adds a captured string if nonCapture flag is false", () => {
            const instance = new RGXWalker("test", ["t"]);
            instance.capture("t");
            expect(instance.capturedStrings).toContain("t");
        });

        it("does not add a captured string if nonCapture flag is true", () => {
            const instance = new RGXWalker("test", ["t"]);
            instance.preventCapture();
            instance.capture("t");
            expect(instance.capturedStrings).not.toContain("t");
        });
    });

    describe("step", () => {
        it("resets flags if flagReset is true", () => {
            const instance = new RGXWalker("test", ["t"]);
            instance.flags.stopped = true;
            instance.flags.skipped = true;
            instance.flags.nonCapture = true;

            instance.step();

            expect(instance.flags.stopped).toBe(false);
            expect(instance.flags.skipped).toBe(false);
            expect(instance.flags.nonCapture).toBe(false);
        });

        it("does not reset flags if flagReset is false", () => {
            const instance = new RGXWalker("test", ["t"]);
            instance.flags.stopped = true;
            instance.flags.skipped = true;
            instance.flags.nonCapture = true;
            
            instance.step(false);

            expect(instance.flags.stopped).toBe(true);
            expect(instance.flags.skipped).toBe(true);
            expect(instance.flags.nonCapture).toBe(true);
        });

        it("returns null if there are no more tokens", () => {
            const instance = new RGXWalker("test", ["t"]);
            instance.tokenPosition = 1;
            expect(instance.step()).toBe(null);
        });

        it("returns the next token if there are more tokens", () => {
            const instance = new RGXWalker("test", ["t", "e"]);
            instance.tokenPosition = 0;
            expect(instance.step()).toBe("t");
        });

        it("triggers pre-capture event if the token is an RGXPart", () => {
            const part = new RGXPart("test");
            const triggerEventSpy = jest.spyOn(part, "triggerEvent");

            const instance = new RGXWalker("test", [part]);
            instance.step();

            expect(triggerEventSpy).toHaveBeenCalledWith("pre-capture", instance);
        });

        it("triggers post-capture event if the token is an RGXPart and nonCapture flag is false", () => {
            const part = new RGXPart("test");
            const triggerEventSpy = jest.spyOn(part, "triggerEvent");

            const instance = new RGXWalker("test", [part]);
            instance.step();

            expect(triggerEventSpy).toHaveBeenCalledWith("post-capture", instance);
        });

        it("does not trigger post-capture event if the token is an RGXPart but nonCapture flag is true", () => {
            const part = new RGXPart("test");
            const triggerEventSpy = jest.spyOn(part, "triggerEvent");
            
            const instance = new RGXWalker("test", [part]);
            instance.preventCapture();
            instance.step(false);

            expect(triggerEventSpy).toHaveBeenCalledWith("pre-capture", instance);
            expect(triggerEventSpy).not.toHaveBeenCalledWith("post-capture", instance);
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

        it("stops stepping if the stopped flag is set to true", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            const predicate = jest.fn(token => {
                if (token === "e") instance.stop();
                return token === "s";
            });

            instance.stepToToken(predicate);

            expect(predicate).toHaveBeenCalledWith("t");
            expect(predicate).toHaveBeenCalledWith("e");
            expect(predicate).not.toHaveBeenCalledWith("s");
            expect(instance.tokenPosition).toBe(2);
        });

        it("resets flags on each step", () => {
            const instance = new RGXWalker("test", [
                new RGXPart("e", { onEvent(_, event, walker) {
                    if (event === "pre-capture") walker.skip();
                }}),

                new RGXPart("s", { onEvent(_, event, walker) {
                    if (event === "pre-capture") expect(walker.flags.skipped).toBe(false);
                }})
            ]);
        });

        it("can be stopped", () => {
            const instance = new RGXWalker("test", ["t", "e", new RGXPart("s", { onEvent(_, event, walker) {
                if (event === "pre-capture") walker.stop();
            }}), "t"]);

            instance.stepToToken(() => false);

            expect(instance.tokenPosition).toBe(3);
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

        it("stops stepping if the token at the current position calls stop", () => {
            const part1 = new RGXPart("e", { onEvent(_, event, walker) {
                if (event === "pre-capture") walker.stop();
            }});

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
            const options = { startingSourcePosition: 2, reducedCurrent: "reduced" };
            const instance = rgxWalker(source, tokens, options);
            const clone = instance.clone();

            expect(clone).not.toBe(instance);

            expect(clone.flags).toEqual(instance.flags);

            expect(clone.source).toBe(instance.source);
            expect(clone.sourcePosition).toBe(instance.sourcePosition);

            expect(clone.tokens).toEqual(instance.tokens);
            expect(clone.tokenPosition).toBe(instance.tokenPosition);

            expect(clone.reducedCurrent).toEqual(instance.reducedCurrent);

            expect(clone.capturedStrings).toEqual(instance.capturedStrings);
        });
    });

});