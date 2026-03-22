import { rgxPart, RGXPart, rgxWalker, RGXWalker } from "src/walker";
import { RGXTokenCollection } from "src/collection";
import { RGXInvalidWalkerError, RGXOutOfBoundsError, RGXPartValidationFailedError, RGXRegexNotMatchedAfterPositionError, RGXRegexNotMatchedAtPositionError } from "src/errors";
import { RGXClassToken, RGXClassUnionToken } from "src/class";
import { rgxwa } from "src/index";
import { expectError } from "../utils";

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

    it("correctly initializes with a source and token array without a part", () => {
        const source = "test";
        const tokens = ["t", "e", "s", "t"];
        const instance = constructor(source, tokens);
        expect(instance.source).toBe(source);
        expect(instance.tokens).toEqual(tokens);
    });

    it("correctly initializes with a source and token array with a part", () => {
        const source = "test";
        const tokens = ["t", "e", "s", new RGXPart("t")];
        const instance = constructor(source, tokens);
        expect(instance.source).toBe(source);
        expect(instance.tokens).toEqual(tokens);
    });

    it("correctly initializes with options", () => {
        const source = "test";
        const tokens = ["t", "e", "s", "t"];
        const options = { startingSourcePosition: 2, reduced: "reduced", share: "share", infinite: true, looping: true };
        const instance = constructor(source, tokens, options);

        expect(instance.sourcePosition).toBe(options.startingSourcePosition);
        expect(instance.reduced).toBe(options.reduced);
        expect(instance.share).toBe(options.share);
        expect(instance.infinite).toBe(options.infinite);
        expect(instance.looping).toBe(options.looping);
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

    describe("rgxwa", () => {
        constructorTest((source, tokens, options) => rgxwa(
            source, tokens,
            options
        ));
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

            expect(() => assertIsRGXWalker({})).toThrow(RGXInvalidWalkerError);
            expect(() => assertIsRGXWalker("test")).toThrow(RGXInvalidWalkerError);
            expect(() => assertIsRGXWalker(123)).toThrow(RGXInvalidWalkerError);
            expect(() => assertIsRGXWalker(null)).toThrow(RGXInvalidWalkerError);
            expect(() => assertIsRGXWalker(undefined)).toThrow(RGXInvalidWalkerError);
            expect(() => assertIsRGXWalker(instance)).toThrow(RGXInvalidWalkerError);
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

        it("accepts source.length (fully consumed position)", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 4;
            expect(instance.sourcePosition).toBe(4);
        });

        it("floors non-integer values", () => {
            const instance = new RGXWalker("test", []);
            instance.sourcePosition = 2.7;
            expect(instance.sourcePosition).toBe(2);
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

        it("floors non-integer values", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            instance.tokenPosition = 2.7;
            expect(instance.tokenPosition).toBe(2);
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
            instance.captures.push({ raw: "first", value: "first", start: 0, end: 5, ownerId: null, branch: 0, groups: null });
            instance.captures.push({ raw: "second", value: "second", start: 5, end: 11, ownerId: null, branch: 0, groups: null });
            expect(instance.lastCapture()).toEqual({ raw: "second", value: "second", start: 5, end: 11, ownerId: null, branch: 0, groups: null });
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

        it("captures the inner token when passed a part", () => {
            const part = new RGXPart("t");
            const instance = new RGXWalker("test", [part]);
            const captured = instance.capture(part);
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
            expect(result).toEqual({ raw: "t", value: "t", start: 0, end: 1, ownerId: null, branch: 0, groups: null });
        });

        it("adds to captures for plain tokens", () => {
            const instance = new RGXWalker("test", ["t"]);
            instance.step();
            expect(instance.captures).toEqual([{ raw: "t", value: "t", start: 0, end: 1, ownerId: null, branch: 0, groups: null }]);
        });

        it("adds to namedCaptures for Parts with IDs", () => {
            const part = new RGXPart("t", { id: "first" });
            const instance = new RGXWalker("test", [part]);
            instance.step();
            expect(instance.namedCaptures).toEqual({ first: [{ raw: "t", value: "t", start: 0, end: 1, ownerId: part.id, branch: 0, groups: null }] });
        });

        it("handles multiple captures for the same Part ID", () => {
            const part = new RGXPart("t", { id: "first" });
            const instance = new RGXWalker("tt", [part, part]);
            instance.step();
            instance.step();
            expect(instance.namedCaptures).toEqual({
                first: [
                    { raw: "t", value: "t", start: 0, end: 1, ownerId: part.id, branch: 0, groups: null },
                    { raw: "t", value: "t", start: 1, end: 2, ownerId: part.id, branch: 0, groups: null }
                ]
            });
        });

        it("does not add to namedCaptures for Parts without IDs", () => {
            const part = new RGXPart("t");
            const instance = new RGXWalker("test", [part]);
            instance.step();
            expect(instance.namedCaptures).toEqual({});
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
            expect(beforeCapture).toHaveBeenCalledWith({ part, walker: instance });
        });

        it("calls afterValidationFailure after a validation failure on Parts", () => {
            const afterValidationFailure = jest.fn();
            const part = new RGXPart("test", {
                validate: () => false,
                afterValidationFailure
            });
            const instance = new RGXWalker("test", [part]);

            expectError(() => instance.step(), RGXPartValidationFailedError, (e) => {
                expect(afterValidationFailure).toHaveBeenCalledWith(e, { part, walker: instance });
            });
        });

        it("calls afterFailure after a match failure on Parts", () => {
            const afterFailure = jest.fn();
            const part = new RGXPart("x", {
                afterFailure
            });
            const instance = new RGXWalker("test", [part]);

            expectError(() => instance.step(), RGXRegexNotMatchedAtPositionError, (e) => {
                expect(afterFailure).toHaveBeenCalledWith(e, { part, walker: instance });
            });
        });

        it("calls afterFailure after a match failure on Parts in non-contiguous mode", () => {
            const afterFailure = jest.fn();
            const part = new RGXPart("x", {
                afterFailure
            });
            const instance = new RGXWalker("test", [part], { contiguous: false });

            expectError(() => instance.step(), RGXRegexNotMatchedAfterPositionError, (e) => {
                expect(afterFailure).toHaveBeenCalledWith(e, { part, walker: instance });
            });
        });

        it("calls afterCapture on Parts with the capture result", () => {
            const afterCapture = jest.fn();
            const part = new RGXPart("test", { afterCapture });
            const instance = new RGXWalker("test", [part]);

            instance.step();
            expect(afterCapture).toHaveBeenCalledWith(
                { raw: "test", value: "test", start: 0, end: 4, ownerId: part.id, branch: 0, groups: null },
                { part, walker: instance }
            );
        });

        it("performs rawTransform before passing to validation", () => {
            const validate = jest.fn(() => true);
            const part = new RGXPart("test", {
                rawTransform: s => s.toUpperCase(),
                validate
            });
            const instance = new RGXWalker("test", [part]);

            instance.step();
            expect(validate).toHaveBeenCalledWith(
                expect.objectContaining({ raw: "TEST" }),
                { part, walker: instance }
            );
        });

        it("applies the Part transform to the value", () => {
            const part = new RGXPart("test", { transform: s => s.toUpperCase() });
            const instance = new RGXWalker("test", [part]);

            const result = instance.step();
            expect(result).toEqual({ raw: "test", value: "TEST", start: 0, end: 4, ownerId: part.id, branch: 0, groups: null });
        });

        it("handles branches correctly with a non-part token", () => {
            const instance = new RGXWalker("bar", [["foo", "bar"]]);
            const result = instance.step();
            expect(result).toEqual({ raw: "bar", value: "bar", start: 0, end: 3, ownerId: null, branch: 1, groups: {
                rgx_branch_0: undefined,
                rgx_branch_1: "bar"
            } });
        });

        it("handles branches correctly with a part with an array token", () => {
            const part = new RGXPart(["foo", "bar"], {
                transform: s => s.toUpperCase()
            });
            const instance = new RGXWalker("bar", [part]);

            const result = instance.step();
            expect(result).toEqual({ raw: "bar", value: "BAR", start: 0, end: 3, ownerId: part.id, branch: 1, groups: {
                rgx_branch_0: undefined,
                rgx_branch_1: "bar"
            } });
        });

        it("handles branches correctly with a part with a token collection in union mode", () => {
            const part = new RGXPart(new RGXTokenCollection(["foo", "bar"], "union"), {
                transform: s => s.toUpperCase()
            });
            const instance = new RGXWalker("bar", [part]);

            const result = instance.step();
            expect(result).toEqual({ raw: "bar", value: "BAR", start: 0, end: 3, ownerId: part.id, branch: 1, groups: {
                rgx_branch_0: undefined,
                rgx_branch_1: "bar"
            } });
        });

        it("handles branches correctly with a part with a token collection in concat mode", () => {
            const part = new RGXPart(new RGXTokenCollection(["foo", "bar"], "concat"), {
                transform: s => s.toUpperCase()
            });
            const instance = new RGXWalker("foobar", [part]);

            const result = instance.step();
            expect(result).toEqual({ raw: "foobar", value: "FOOBAR", start: 0, end: 6, ownerId: part.id, branch: 0, groups: null });
        });

        it("handles branches correctly with a part with a class union token", () => {
            const part = new RGXPart(new RGXClassUnionToken(["foo", "bar"]), {
                transform: s => s.toUpperCase()
            });
            const instance = new RGXWalker("bar", [part]);

            const result = instance.step();
            expect(result).toEqual({ raw: "bar", value: "BAR", start: 0, end: 3, ownerId: part.id, branch: 1, groups: {
                rgx_branch_0: undefined,
                rgx_branch_1: "bar"
            } });
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

        describe("beforeCapture calls stop()", () => {
            it("sets stopped and returns null without advancing", () => {
                const part = new RGXPart("t", {
                    beforeCapture: ({ walker }) => { walker.stop(); }
                });
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
                const part = new RGXPart("t", { id: "first", beforeCapture: () => "silent" });
                const instance = new RGXWalker("test", [part]);

                const result = instance.step();
                // Still returns the capture result
                expect(result).toEqual({ raw: "t", value: "t", start: 0, end: 1, ownerId: part.id, branch: 0, groups: null });
                // But NOT added to captures
                expect(instance.captures).toEqual([]);
                // And namedCaptures is not added to either
                expect(instance.namedCaptures.first).toEqual(undefined);
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

        describe("beforeCapture returns 'stop-silent'", () => {
            it("sets stopped and captures but does not record in captures array", () => {
                const part = new RGXPart("t", { id: "first", beforeCapture: () => "stop-silent" });
                const instance = new RGXWalker("test", [part]);

                const result = instance.step();
                // Does not return a capture result
                expect(result).toEqual(null);
                expect(instance.stopped).toBe(true);
                // But NOT added to captures
                expect(instance.captures).toEqual([]);
                // And namedCaptures is not added to either
                expect(instance.namedCaptures.first).toEqual(undefined);
                // Positions do not advance
                expect(instance.tokenPosition).toBe(0);
                expect(instance.sourcePosition).toBe(0);
            });
        });

        describe("afterCapture calls stop()", () => {
            it("sets stopped after capturing", () => {
                const part = new RGXPart("t", {
                    afterCapture: (_, { walker }) => { walker.stop(); }
                });
                const instance = new RGXWalker("test", [part]);

                const result = instance.step();
                expect(result).toEqual(null);
                expect(instance.stopped).toBe(true);
                // Token was captured and position advanced
                expect(instance.tokenPosition).toBe(1);
                expect(instance.captures).toHaveLength(1);
            });

            it("still respects 'silent' return", () => {
                const part = new RGXPart("t", {
                    afterCapture: (_, { walker }) => { walker.stop(); return 'silent'; }
                });
                const instance = new RGXWalker("test", [part]);

                const result = instance.step();
                expect(result).toEqual(null);
                expect(instance.stopped).toBe(true);
                // Position advances, but token not captured due to 'silent' behavior
                expect(instance.tokenPosition).toBe(1);
                expect(instance.captures).toHaveLength(0);
            });

            it("still respects 'stop-silent' return", () => {
                const part = new RGXPart("t", {
                    afterCapture: (_, { walker }) => { walker.stop(); return 'stop-silent'; }
                });
                const instance = new RGXWalker("test", [part]);

                const result = instance.step();
                expect(result).toEqual(null);
                expect(instance.stopped).toBe(true);
                // Position advances, but token not captured due to 'stop-silent' behavior
                expect(instance.tokenPosition).toBe(1);
                expect(instance.captures).toHaveLength(0);
            });
        });

        describe("afterCapture returns 'stop'", () => {
            it("sets stopped after capturing", () => {
                const part = new RGXPart("t", {
                    afterCapture: () => "stop"
                });
                const instance = new RGXWalker("test", [part]);

                const result = instance.step();

                // Does not return the capture result
                expect(result).toEqual(null);
                expect(instance.stopped).toBe(true);
                // Token was captured and position advanced
                expect(instance.tokenPosition).toBe(1);
                expect(instance.captures).toHaveLength(1);
            });
        });

        describe("afterCapture returns 'skip'", () => {
            it("advances tokenPosition but not sourcePosition after capturing", () => {
                const part = new RGXPart("t", {
                    afterCapture: () => "skip"
                });
                const instance = new RGXWalker("test", [part, "e"]);

                const result = instance.step();
                expect(result).toEqual(null);
                expect(instance.stopped).toBe(false);
                // Token position advances past the captured Part
                expect(instance.tokenPosition).toBe(1);
                // Source position does NOT advance
                expect(instance.sourcePosition).toBe(0);
            });
        });

        describe("afterCapture returns 'silent'", () => {
            it("advances positions and captures but does not record in captures array", () => {
                const part = new RGXPart("t", {
                    id: "first",
                    afterCapture: () => "silent"
                });
                const instance = new RGXWalker("test", [part, "e"]);

                const result = instance.step();
                // Still returns the capture result
                expect(result).toEqual({"branch": 0, "end": 1, "groups": null, "ownerId": "first", "raw": "t", "start": 0, "value": "t"});
                expect(instance.stopped).toBe(false);
                // Token position advances past the captured Part
                expect(instance.tokenPosition).toBe(1);
                // Source position advances normally
                expect(instance.sourcePosition).toBe(1);
                // But NOT added to captures
                expect(instance.captures).toEqual([]);
                // And namedCaptures is an empty array for the part ID
                expect(instance.namedCaptures.first).toEqual([]);
            });
        });

        describe("afterCapture returns 'stop-silent'", () => {
            it("sets stopped and captures but does not record in captures array", () => {
                const part = new RGXPart("t", {
                    id: "first",
                    afterCapture: () => "stop-silent"
                });
                const instance = new RGXWalker("test", [part, "e"]);

                const result = instance.step();
                // Does not return the capture result
                expect(result).toEqual(null);
                expect(instance.stopped).toBe(true);
                // Token position advances past the captured Part
                expect(instance.tokenPosition).toBe(1);
                // Source position advances normally
                expect(instance.sourcePosition).toBe(1);
                // But NOT added to captures
                expect(instance.captures).toEqual([]);
                // And namedCaptures is an empty array for the part ID
                expect(instance.namedCaptures.first).toEqual([]);
            });
        });

        describe("afterFailure returns 'stop'", () => {
            it("sets stopped after a match failure", () => {
                const part = new RGXPart("x", {
                    afterFailure: () => "stop"
                });
                const instance = new RGXWalker("test", [part]);

                const result = instance.step();
                expect(result).toBe(null);
                expect(instance.stopped).toBe(true);
                // Neither position advances on failure
                expect(instance.tokenPosition).toBe(0);
                expect(instance.sourcePosition).toBe(0);
            });
        });

        describe("afterFailure calls stop()", () => {
            it("sets stopped after a match failure", () => {
                const part = new RGXPart("x", {
                    afterFailure: (_, { walker }) => { walker.stop(); }
                });
                const instance = new RGXWalker("test", [part]);
                
                const result = instance.step();
                expect(result).toBe(null);
                expect(instance.stopped).toBe(true);
                // Neither position advances on failure
                expect(instance.tokenPosition).toBe(0);
                expect(instance.sourcePosition).toBe(0);
            });
        });

        describe("afterFailure returns 'skip'", () => {
            it("advances tokenPosition but not sourcePosition after a match failure", () => {
                const part = new RGXPart("x", {
                    afterFailure: () => "skip"
                });
                const instance = new RGXWalker("test", [part, "t"]);

                const result = instance.step();
                expect(result).toBe(null);
                expect(instance.stopped).toBe(false);
                // Token position advances past the failed Part
                expect(instance.tokenPosition).toBe(1);
                // Source position does NOT advance
                expect(instance.sourcePosition).toBe(0);
            });
        });

        describe("afterValidationFailure returns 'stop'", () => {
            it("sets stopped after a validation failure", () => {
                const part = new RGXPart("t", {
                    validate: () => false,
                    afterValidationFailure: () => "stop"
                });
                const instance = new RGXWalker("test", [part]);

                const result = instance.step();
                expect(result).toBe(null);
                expect(instance.stopped).toBe(true);
                // Neither position advances on failure
                expect(instance.tokenPosition).toBe(0);
                expect(instance.sourcePosition).toBe(0);
            });
        });

        describe("afterValidationFailure calls stop()", () => {
            it("sets stopped after a validation failure", () => {
                const part = new RGXPart("t", {
                    validate: () => false,
                    afterValidationFailure: (_, { walker }) => { walker.stop(); }
                });
                const instance = new RGXWalker("test", [part]);
                
                const result = instance.step();
                expect(result).toBe(null);
                expect(instance.stopped).toBe(true);
                // Neither position advances on failure
                expect(instance.tokenPosition).toBe(0);
                expect(instance.sourcePosition).toBe(0);
            });
        });

        describe("afterValidationFailure returns 'skip'", () => {
            it("advances tokenPosition but not sourcePosition after a validation failure", () => {
                const part = new RGXPart("t", {
                    validate: () => false,
                    afterValidationFailure: () => "skip"
                });
                const instance = new RGXWalker("test", [part, "t"]);

                const result = instance.step();
                expect(result).toBe(null);
                expect(instance.stopped).toBe(false);
                // Token position advances past the failed Part
                expect(instance.tokenPosition).toBe(1);
                // Source position does NOT advance
                expect(instance.sourcePosition).toBe(0);
            });
        });

        describe("infinite mode", () => {
            it("stays on the last token after capturing it", () => {
                const instance = new RGXWalker("tt", ["t"], { infinite: true });
                instance.step();
                expect(instance.tokenPosition).toBe(0);
                expect(instance.sourcePosition).toBe(1);
            });

            it("still advances tokenPosition when not at the last token", () => {
                const instance = new RGXWalker("test", ["t", "e"], { infinite: true });
                instance.step();
                expect(instance.tokenPosition).toBe(1);
            });

            it("sets stopped and returns null when source is exhausted", () => {
                const instance = new RGXWalker("t", ["t"], { infinite: true });
                instance.step(); // captures "t", stays at token 0, source now exhausted
                const result = instance.step();
                expect(result).toBe(null);
                expect(instance.stopped).toBe(true);
            });
        });

        describe("looping mode", () => {
            it("resets tokenPosition to 0 when the end is reached", () => {
                const instance = new RGXWalker("test", ["t", "e"], { looping: true });
                instance.step(); // tokenPosition 0 -> 1
                instance.step(); // tokenPosition 1 -> 2 (end) -> reset to 0
                expect(instance.tokenPosition).toBe(0);
            });

            it("still advances tokenPosition when not at the last token", () => {
                const instance = new RGXWalker("test", ["t", "e"], { looping: true });
                instance.step();
                expect(instance.tokenPosition).toBe(1);
            });

            it("sets stopped and returns null when source is exhausted", () => {
                const instance = new RGXWalker("t", ["t"], { looping: true });
                instance.step(); // captures "t", stays at token 0, source now exhausted
                const result = instance.step();
                expect(result).toBe(null);
                expect(instance.stopped).toBe(true);
            });
        });

        describe("non-contiguous mode", () => {
            it("does not require tokens to be contiguous in the source", () => {
                const instance = new RGXWalker("txexsxt", ["t", "e", "s", "t"], { contiguous: false });
                instance.walk();
                expect(instance.captures).toEqual([
                    { raw: "t", value: "t", start: 0, end: 1, ownerId: null, branch: 0, groups: null },
                    { raw: "e", value: "e", start: 2, end: 3, ownerId: null, branch: 0, groups: null },
                    { raw: "s", value: "s", start: 4, end: 5, ownerId: null, branch: 0, groups: null },
                    { raw: "t", value: "t", start: 6, end: 7, ownerId: null, branch: 0, groups: null },
                ]);
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
                    afterCapture: (_, { walker }) => { walker.stop(); }
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
                afterCapture: (_, { walker }) => { walker.stop(); }
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

        it("stops without throwing if it gets to the end of the tokens without consuming all the source", () => {
            const instance = new RGXWalker("test", ["t", "e"]);
            expect(() => instance.walk()).not.toThrow();
            expect(instance.tokenPosition).toBe(2);
            expect(instance.sourcePosition).toBe(2);
        });

        it("populates captures for all tokens", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            instance.walk();
            expect(instance.captures).toEqual([
                { raw: "t", value: "t", start: 0, end: 1, ownerId: null, branch: 0, groups: null },
                { raw: "e", value: "e", start: 1, end: 2, ownerId: null, branch: 0, groups: null },
                { raw: "s", value: "s", start: 2, end: 3, ownerId: null, branch: 0, groups: null },
                { raw: "t", value: "t", start: 3, end: 4, ownerId: null, branch: 0, groups: null },
            ]);
        });

        it("applies transforms for Parts", () => {
            const part = new RGXPart("es", { transform: s => s.toUpperCase() });
            const instance = new RGXWalker("test", ["t", part, "t"]);
            instance.walk();
            expect(instance.captures).toEqual([
                { raw: "t", value: "t", start: 0, end: 1, ownerId: null, branch: 0, groups: null },
                { raw: "es", value: "ES", start: 1, end: 3, ownerId: part.id, branch: 0, groups: null },
                { raw: "t", value: "t", start: 3, end: 4, ownerId: null, branch: 0, groups: null },
            ]);
        });

        it("returns the reduced value", () => {
            const instance = new RGXWalker<string>("test", ["t", "e", "s", new RGXPart("t", {
                afterCapture: (_, { walker }) => { walker.reduced = "reduced"; }
            })], { reduced: "not-reduced" });
            const result = instance.walk();
            expect(result).toBe("reduced");
        });
    });

    describe("tryWalk", () => {
        it("returns true on successful walk", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", "t"]);
            expect(instance.tryWalk()).toBe(true);
            expect(instance.tokenPosition).toBe(4);
            expect(instance.sourcePosition).toBe(4);
        });

        it("returns false and resets positions on failed walk", () => {
            const instance = new RGXWalker("test", ["t", "e", "x", "t"]);
            expect(instance.tryWalk()).toBe(false);
            expect(instance.tokenPosition).toBe(0);
            expect(instance.sourcePosition).toBe(0);
        });

        it("resets positions when an unexpected error is thrown", () => {
            const instance = new RGXWalker("test", ["t", "e", "s", rgxPart("t", {
                validate: () => { throw new Error("Unexpected error"); }
            })]);
            expect(() => instance.tryWalk()).toThrow("Unexpected error");
            expect(instance.tokenPosition).toBe(0);
            expect(instance.sourcePosition).toBe(0);
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
            const options = { startingSourcePosition: 2, reduced: "reduced", share: "share", infinite: true };
            const instance = rgxWalker(source, tokens, options);
            const clone = instance.clone();

            expect(clone).not.toBe(instance);

            expect(clone.stopped).toEqual(instance.stopped);
            expect(clone.infinite).toBe(instance.infinite);

            expect(clone.source).toBe(instance.source);
            expect(clone.sourcePosition).toBe(instance.sourcePosition);

            expect(clone.tokens).toEqual(instance.tokens);
            expect(clone.tokenPosition).toBe(instance.tokenPosition);

            expect(clone.reduced).toEqual(instance.reduced);
            expect(clone.share).toEqual(instance.share);

            expect(clone.captures).toEqual(instance.captures);
            expect(clone.namedCaptures).toEqual(instance.namedCaptures);
        });
    });

});