import { RGXInvalidLexerError, RGXInvalidLexerModeError, RGXLexemeNotMatchedAtPositionError, RGXOutOfBoundsError, RGXPartValidationFailedError, RGXRegexNotMatchedAtPositionError } from "src/errors";
import { RGXLexer, rgxLexer, RGXLexemeDefinitions, rgxLexemeLocationFromIndex, RGXLexeme } from "src/lexer";
import { rgxPart } from "src/walker";
import { expectError } from "../utils";

function constructorTest<Data = unknown>(constructor: typeof rgxLexer<Data>) {
    it("constructs an instance of RGXLexer", () => {
        const lexer = constructor("test");
        expect(lexer).toBeInstanceOf(RGXLexer);
    });

    it("initializes with the correct source", () => {
        const source = "hello world";
        const lexer = constructor(source);
        expect(lexer.source).toBe(source);
    });

    it("initializes with the correct position", () => {
        const lexer = constructor("test");
        expect(lexer.position).toBe(0);
    });

    it("initializes with the correct lexemeDefinitions", () => {
        const lexemeDefinitions: RGXLexemeDefinitions<Data> = {
            default: [
                { id: "lexeme1", type: "resolve", token: "word" },
                { id: "lexeme2", type: "resolve", token: "space" }
            ]
        };

        const lexer = constructor("test", lexemeDefinitions);
        expect(lexer.lexemeDefinitions).toEqual(lexemeDefinitions);
    });

    it("sorts lexemeDefinitions by priority", () => {
        const lexemeDefinitions: RGXLexemeDefinitions<Data> = {
            default: [
                { id: "lexeme1", type: "resolve", token: "word", priority: 1 },
                { id: "lexeme2", type: "resolve", token: "space", priority: 3 },
                { id: "lexeme3", type: "resolve", token: "number", priority: 2 }
            ]
        };

        const lexer = constructor("test", lexemeDefinitions);
        expect(lexer.lexemeDefinitions.default!.map(def => def.id)).toEqual(["lexeme2", "lexeme3", "lexeme1"]);
    });

    it("considers unspecified priority to be 0", () => {
        const lexemeDefinitions: RGXLexemeDefinitions<Data> = {
            default: [
                { id: "lexeme1", type: "resolve", token: "word" },
                { id: "lexeme2", type: "resolve", token: "space", priority: 1 },
                { id: "lexeme3", type: "resolve", token: "number", priority: -1 }
            ]
        };

        const lexer = constructor("test", lexemeDefinitions);
        expect(lexer.lexemeDefinitions.default!.map(def => def.id)).toEqual(["lexeme2", "lexeme1", "lexeme3"]);
    });

    it("creates a default lexemeDefinitions object if none is provided", () => {
        const lexer = constructor("test", {});
        expect(lexer.lexemeDefinitions).toEqual({ default: [] });
    });
}

describe("rgxLexemeLocationFromIndex", () => {
    it("returns line 1 column 1 for index 0", () => {
        const location = rgxLexemeLocationFromIndex("hello\nworld", 0);
        expect(location).toEqual({ index: 0, line: 1, column: 1 });
    });

    it("returns correct line and column for a given index within line 1", () => {
        const location = rgxLexemeLocationFromIndex("hello\nworld", 3);
        expect(location).toEqual({ index: 3, line: 1, column: 4 });
    });

    it("returns correct line and column for a given index within line 2", () => {
        const location = rgxLexemeLocationFromIndex("hello\nworld", 7);
        expect(location).toEqual({ index: 7, line: 2, column: 2 });
    });

    it("returns correct line and column for a given index that is exactly at a newline", () => {
        const location = rgxLexemeLocationFromIndex("hello\nworld", 5);
        expect(location).toEqual({ index: 5, line: 1, column: 6 });
    });

    it("returns correct line and column for a given index that is at the end of the string", () => {
        const location = rgxLexemeLocationFromIndex("hello\nworld", 11);
        expect(location).toEqual({ index: 11, line: 2, column: 6 });
    });

    it("throws an error if index is out of bounds", () => {
        expect(() => rgxLexemeLocationFromIndex("hello", -1)).toThrow(RGXOutOfBoundsError);
        expect(() => rgxLexemeLocationFromIndex("hello", 6)).toThrow(RGXOutOfBoundsError);
    });
});

const isRGXLexer = RGXLexer.check;
const assertIsRGXLexer = RGXLexer.assert;

describe("RGXLexer", () => {
    describe("constructor", () => {
        constructorTest((...args) => new RGXLexer(...args));
    });

    describe("construct function", () => {
        constructorTest(rgxLexer);
    });

    describe("type guards", () => {
        it("accepts RGXLexer instances", () => {
            const lexer = new RGXLexer("test");
            expect(isRGXLexer(lexer)).toBe(true);
            expect(() => assertIsRGXLexer(lexer)).not.toThrow();
        });

        it("rejects non-RGXLexer instances", () => {
            const notALexer = { source: "test", position: 0 };
            expect(isRGXLexer(notALexer)).toBe(false);
            expect(() => assertIsRGXLexer(notALexer)).toThrow(RGXInvalidLexerError);
        });
    });

    describe("position", () => {
        it("accepts 0", () => {
            const lexer = new RGXLexer("test");
            expect(() => { lexer.position = 0 }).not.toThrow();
        });

        it("accepts a positive integer less than the length of the source", () => {
            const lexer = new RGXLexer("test");
            expect(() => { lexer.position = 2 }).not.toThrow();
        });

        it("accepts exactly the length of the source", () => {
            const lexer = new RGXLexer("test");
            expect(() => { lexer.position = 4 }).not.toThrow();
        });

        it("rejects a negative integer", () => {
            const lexer = new RGXLexer("test");
            expect(() => { lexer.position = -1 }).toThrow(RGXOutOfBoundsError);
        });

        it("rejects an integer greater than the length of the source", () => {
            const lexer = new RGXLexer("test");
            expect(() => { lexer.position = 5 }).toThrow(RGXOutOfBoundsError);
        });

        it("floors a non-integer number", () => {
            const lexer = new RGXLexer("test");
            lexer.position = 2.7;
            expect(lexer.position).toBe(2);
        });
    });

    describe("validateMode", () => {
        it("accepts a mode within lexemeDefinitions", () => {
            const lexemeDefinitions: RGXLexemeDefinitions<unknown> = {
                default: [],
                mode1: []
            };
            const lexer = new RGXLexer("test", lexemeDefinitions);
            expect(() => lexer.validateMode("mode1")).not.toThrow();
        });

        it("rejects a mode not within lexemeDefinitions", () => {
            const lexemeDefinitions: RGXLexemeDefinitions<unknown> = {
                default: [],
                mode1: []
            };
            const lexer = new RGXLexer("test", lexemeDefinitions);
            expect(() => lexer.validateMode("mode2")).toThrow(RGXInvalidLexerModeError);
        });
    });

    describe("lastMatched", () => {
        it("is null before any lexemes are matched", () => {
            const lexer = new RGXLexer("test");
            expect(lexer.lastMatched()).toBeNull();
        });

        it("returns the last matched lexeme", () => {
            const lexer = new RGXLexer("foo");

            const lexeme: RGXLexeme<unknown> = {
                id: "def1",
                raw: "foo",
                start: rgxLexemeLocationFromIndex("foo", 0),
                end: rgxLexemeLocationFromIndex("foo", 3)
            };
            lexer.matched.push(lexeme);

            expect(lexer.lastMatched()).toBe(lexeme);
        });
    });

    describe("hasNext", () => {
        it("is true if at the beginning of the source", () => {
            const lexer = new RGXLexer("test");
            expect(lexer.hasNext()).toBe(true);
        });

        it("is true if in the middle of the source", () => {
            const lexer = new RGXLexer("test");
            lexer.position = 2;
            expect(lexer.hasNext()).toBe(true);
        });

        it("is false if at the end of the source", () => {
            const lexer = new RGXLexer("test");
            lexer.position = 4;
            expect(lexer.hasNext()).toBe(false);
        });
    });

    describe("isAtEnd", () => {
        it("is false if at the beginning of the source", () => {
            const lexer = new RGXLexer("test");
            expect(lexer.isAtEnd()).toBe(false);
        });

        it("is false if in the middle of the source", () => {
            const lexer = new RGXLexer("test");
            lexer.position = 2;
            expect(lexer.isAtEnd()).toBe(false);
        });

        it("is true if at the end of the source", () => {
            const lexer = new RGXLexer("test");
            lexer.position = 4;
            expect(lexer.isAtEnd()).toBe(true);
        });
    });

    describe("remaining", () => {
        it("returns the entire source if at the beginning", () => {
            const lexer = new RGXLexer("test");
            expect(lexer.remaining()).toBe("test");
        });

        it("returns the remaining source if in the middle", () => {
            const lexer = new RGXLexer("test");
            lexer.position = 2;
            expect(lexer.remaining()).toBe("st");
        });

        it("returns an empty string if at the end", () => {
            const lexer = new RGXLexer("test");
            lexer.position = 4;
            expect(lexer.remaining()).toBe("");
        });
    });

    describe("consume", () => {
        it("returns null if at the end", () => {
            const lexer = new RGXLexer("test");
            lexer.position = 4;
            expect(lexer.consume()).toBeNull();
        });

        it("matches a valid resolve lexeme definition at the current position when it is the only available definition", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });

            const lexeme = lexer.consume("mode1");

            expect(lexeme).not.toBeNull();
            expect(lexeme).toEqual({
                id: "def1",
                raw: "foo",
                start: rgxLexemeLocationFromIndex("foo", 0),
                end: rgxLexemeLocationFromIndex("foo", 3),
            });
        });

        it("matches a valid resolve lexeme definition at the current position when it is not the only available definition", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "bar"
                    },

                    {
                        id: "def2",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });

            const lexeme = lexer.consume("mode1");

            expect(lexeme).not.toBeNull();
            expect(lexeme).toEqual({
                id: "def2",
                raw: "foo",
                start: rgxLexemeLocationFromIndex("foo", 0),
                end: rgxLexemeLocationFromIndex("foo", 3),
            });
        });

        it("matches a valid walk lexeme definition at the current position when it is the only available definition", () => {
            type Data = { capture: string };
            const lexer = new RGXLexer<Data>("foobar", {
                mode1: [
                    {
                        id: "def1",
                        type: "walk",
                        tokens: [
                            rgxPart("foo", {
                                afterCapture(c, _, __, w) {
                                    w.reduced.capture = c.raw;
                                }
                            })
                        ],
                        options: {
                            reduced: () => ({ capture: "" })
                        }
                    }
                ]
            });

            const lexeme = lexer.consume("mode1");

            expect(lexeme).not.toBeNull();
            expect(lexeme).toEqual({
                id: "def1",
                raw: "foo",
                start: rgxLexemeLocationFromIndex("foobar", 0),
                end: rgxLexemeLocationFromIndex("foobar", 3),
                data: { capture: "foo" }
            });
        });

        it("matches a valid walk lexeme definition at the current position when it is not the only available definition", () => {
            type Data = { capture: string };
            const lexer = new RGXLexer<Data>("foobar", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "bar"
                    },

                    {
                        id: "def2",
                        type: "walk",
                        tokens: [
                            rgxPart("foo", {
                                afterCapture(c, _, __, w) {
                                    w.reduced.capture = c.raw;
                                }
                            })
                        ],
                        options: {
                            reduced: () => ({ capture: "" })
                        }
                    }
                ]
            });

            const lexeme = lexer.consume("mode1");

            expect(lexeme).not.toBeNull();
            expect(lexeme).toEqual({
                id: "def2",
                raw: "foo",
                start: rgxLexemeLocationFromIndex("foobar", 0),
                end: rgxLexemeLocationFromIndex("foobar", 3),
                data: { capture: "foo" }
            });
        });

        it("advances past the matched token", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });
            
            lexer.consume("mode1");

            expect(lexer.position).toBe(3);
        });

        it("logs the matched token by default", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });
            
            lexer.consume("mode1");

            expect(lexer.lastMatched()).toEqual({
                id: "def1",
                raw: "foo",
                start: rgxLexemeLocationFromIndex("foobar", 0),
                end: rgxLexemeLocationFromIndex("foobar", 3)
            })
        });

        it("does not log the matched token when log is false", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });
            
            lexer.consume("mode1", false);

            expect(lexer.lastMatched()).toBeNull();
        });

        it("uses the default mode by default", () => {
            const lexer = new RGXLexer("foo", {
                default: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });
            
            const lexeme = lexer.consume();

            expect(lexeme).not.toBeNull();
        });

        it("throws the correct error when no definitions match at the current position", () => {
            const lexer = new RGXLexer("bar", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    },

                    {
                        id: "def2",
                        type: "walk",
                        tokens: [
                            rgxPart("bar", {
                                validate() {
                                    return false;
                                },
                            })
                        ]
                    }
                ]
            });

            expectError(() => lexer.consume("mode1"), RGXLexemeNotMatchedAtPositionError, (e) => {
                expect(e.causes[0]?.error).toBeInstanceOf(RGXRegexNotMatchedAtPositionError);
                expect(e.causes[1]?.error).toBeInstanceOf(RGXPartValidationFailedError);
            });
        });

        it("handles an unexpected error by rethrowing it", () => {
            const lexer = new RGXLexer("bar", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    },

                    {
                        id: "def2",
                        type: "walk",
                        tokens: [
                            rgxPart("bar", {
                                validate() {
                                    throw new Error("Intentional")
                                },
                            })
                        ]
                    }
                ]
            });

            expectError(() => lexer.consume("mode1"), Error, (e) => {
                expect(e.message).toBe("Intentional")
            });
        });
    });

    describe("peek", () => {
        it("returns null if at the end", () => {
            const lexer = new RGXLexer("test");
            lexer.position = 4;
            expect(lexer.peek()).toBeNull();
        });

        it("matches a valid resolve lexeme definition at the current position when it is the only available definition", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });

            const lexeme = lexer.peek("mode1");

            expect(lexeme).not.toBeNull();
            expect(lexeme).toEqual({
                id: "def1",
                raw: "foo",
                start: rgxLexemeLocationFromIndex("foo", 0),
                end: rgxLexemeLocationFromIndex("foo", 3),
            });
        });

        it("matches a valid resolve lexeme definition at the current position when it is not the only available definition", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "bar"
                    },

                    {
                        id: "def2",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });

            const lexeme = lexer.peek("mode1");

            expect(lexeme).not.toBeNull();
            expect(lexeme).toEqual({
                id: "def2",
                raw: "foo",
                start: rgxLexemeLocationFromIndex("foo", 0),
                end: rgxLexemeLocationFromIndex("foo", 3),
            });
        });

        it("matches a valid walk lexeme definition at the current position when it is the only available definition", () => {
            type Data = { capture: string };
            const lexer = new RGXLexer<Data>("foobar", {
                mode1: [
                    {
                        id: "def1",
                        type: "walk",
                        tokens: [
                            rgxPart("foo", {
                                afterCapture(c, _, __, w) {
                                    w.reduced.capture = c.raw;
                                }
                            })
                        ],
                        options: {
                            reduced: () => ({ capture: "" })
                        }
                    }
                ]
            });

            const lexeme = lexer.peek("mode1");

            expect(lexeme).not.toBeNull();
            expect(lexeme).toEqual({
                id: "def1",
                raw: "foo",
                start: rgxLexemeLocationFromIndex("foobar", 0),
                end: rgxLexemeLocationFromIndex("foobar", 3),
                data: { capture: "foo" }
            });
        });

        it("matches a valid walk lexeme definition at the current position when it is not the only available definition", () => {
            type Data = { capture: string };
            const lexer = new RGXLexer<Data>("foobar", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "bar"
                    },

                    {
                        id: "def2",
                        type: "walk",
                        tokens: [
                            rgxPart("foo", {
                                afterCapture(c, _, __, w) {
                                    w.reduced.capture = c.raw;
                                }
                            })
                        ],
                        options: {
                            reduced: () => ({ capture: "" })
                        }
                    }
                ]
            });

            const lexeme = lexer.peek("mode1");

            expect(lexeme).not.toBeNull();
            expect(lexeme).toEqual({
                id: "def2",
                raw: "foo",
                start: rgxLexemeLocationFromIndex("foobar", 0),
                end: rgxLexemeLocationFromIndex("foobar", 3),
                data: { capture: "foo" }
            });
        });

        it("does not advance past the matched token", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });
            
            lexer.peek("mode1");

            expect(lexer.position).toBe(0);
        });

        it("does not log the matched token", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });

            lexer.peek("mode1");

            expect(lexer.lastMatched()).toBeNull();
        });

        it("uses the default mode by default", () => {
            const lexer = new RGXLexer("foo", {
                default: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });
            
            const lexeme = lexer.peek();

            expect(lexeme).not.toBeNull();
        });

        it("throws the correct error when no definitions match at the current position", () => {
            const lexer = new RGXLexer("bar", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    },

                    {
                        id: "def2",
                        type: "walk",
                        tokens: [
                            rgxPart("bar", {
                                validate() {
                                    return false;
                                },
                            })
                        ]
                    }
                ]
            });

            expectError(() => lexer.peek("mode1"), RGXLexemeNotMatchedAtPositionError, (e) => {
                expect(e.causes[0]?.error).toBeInstanceOf(RGXRegexNotMatchedAtPositionError);
                expect(e.causes[1]?.error).toBeInstanceOf(RGXPartValidationFailedError);
            });
        });
    });

    describe("expectConsume", () => {
        it("returns the matched lexeme if the id matches the expected id", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });

            const lexeme = lexer.expectConsume("def1", "mode1");

            expect(lexeme).not.toBeNull();
            expect(lexeme).toEqual({
                id: "def1",
                raw: "foo",
                start: rgxLexemeLocationFromIndex("foo", 0),
                end: rgxLexemeLocationFromIndex("foo", 3),
            });
        });

        it("throws the correct error if the id does not match the expected id", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });

            expectError(() => lexer.expectConsume("def2", "mode1"), RGXLexemeNotMatchedAtPositionError, (e) => {
                expect(e.message).toBe('Expected lexeme "def2" but got lexeme "def1"; Mode: mode1, Position: 3, Context: foo');
            });
        });

        it("throws the correct error if the matched token is null", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });

            lexer.consume("mode1");

            expectError(() => lexer.expectConsume("def2", "mode1"), RGXLexemeNotMatchedAtPositionError, (e) => {
                expect(e.message).toBe('Expected lexeme "def2" but got source end; Mode: mode1, Position: 3, Context: foo');
            });
        });

        it("advances past the matched token", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });

            lexer.expectConsume("def1", "mode1");

            expect(lexer.position).toBe(3);
        });

        it("logs the matched lexeme if the id matches the expected id by default", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });

            lexer.expectConsume("def1", "mode1");

            expect(lexer.lastMatched()).toEqual({
                id: "def1",
                raw: "foo",
                start: rgxLexemeLocationFromIndex("foo", 0),
                end: rgxLexemeLocationFromIndex("foo", 3)
            });
        });

        it("does not log the matched lexeme if the id matches the expected id when log is false", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });

            lexer.expectConsume("def1", "mode1", false);
            
            expect(lexer.lastMatched()).toBeNull();
        });

        it("uses default mode by default", () => {
            const lexer = new RGXLexer("foo", {
                default: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });

            const lexeme = lexer.expectConsume("def1");

            expect(lexeme).not.toBeNull();
            expect(lexeme).toEqual({
                id: "def1",
                raw: "foo",
                start: rgxLexemeLocationFromIndex("foo", 0),
                end: rgxLexemeLocationFromIndex("foo", 3),
            });
        });
    });

    describe("expectPeek", () => {
        it("returns the matched lexeme if the id matches the expected id", () => {
             const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });

            const lexeme = lexer.expectPeek("def1", "mode1");

            expect(lexeme).not.toBeNull();
            expect(lexeme).toEqual({
                id: "def1",
                raw: "foo",
                start: rgxLexemeLocationFromIndex("foo", 0),
                end: rgxLexemeLocationFromIndex("foo", 3),
            });
        });

        it("throws the correct error if the id does not match the expected id", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });

            expectError(() => lexer.expectPeek("def2", "mode1"), RGXLexemeNotMatchedAtPositionError, (e) => {
                expect(e.message).toBe('Expected lexeme "def2" but got lexeme "def1"; Mode: mode1, Position: 0, Context: foo');
            });
        });

        it("throws the correct error if the matched token is null", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });

            lexer.consume("mode1");

            expectError(() => lexer.expectPeek("def2", "mode1"), RGXLexemeNotMatchedAtPositionError, (e) => {
                expect(e.message).toBe('Expected lexeme "def2" but got source end; Mode: mode1, Position: 3, Context: foo');
            });
        });

        it("does not advance past the matched token", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });

            lexer.expectPeek("def1", "mode1");

            expect(lexer.position).toBe(0);
        });

        it("does not log the matched lexeme", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });

            lexer.expectPeek("def1", "mode1");

            expect(lexer.lastMatched()).toBeNull();
        });

        it("uses default mode by default", () => {
            const lexer = new RGXLexer("foo", {
                default: [
                    {
                        id: "def1",
                        type: "resolve",
                        token: "foo"
                    }
                ]
            });

            const lexeme = lexer.expectPeek("def1");

            expect(lexeme).not.toBeNull();
            expect(lexeme).toEqual({
                id: "def1",
                raw: "foo",
                start: rgxLexemeLocationFromIndex("foo", 0),
                end: rgxLexemeLocationFromIndex("foo", 3),
            });
        });
    });

    describe("skip", () => {
        it("advances the specified number of lexemes", () => {
            const lexer = new RGXLexer("foo bar baz", {
                mode1: [
                    { id: "word", type: "resolve", token: /\w+/ },
                    { id: "space", type: "resolve", token: /\s+/ }
                ]
            });

            lexer.skip(2, "mode1");

            expect(lexer.position).toBe(4);
        });

        it("defaults to skipping 1 lexeme", () => {
            const lexer = new RGXLexer("foo bar baz", {
                mode1: [
                    { id: "word", type: "resolve", token: /\w+/ },
                    { id: "space", type: "resolve", token: /\s+/ }
                ]
            });

            lexer.skip(undefined, "mode1");
            
            expect(lexer.position).toBe(3);
        });

        it("stops skipping if it reaches the end even if the specified number has not been skipped", () => {
            const lexer = new RGXLexer("foo", {
                mode1: [
                    { id: "word", type: "resolve", token: /\w+/ },
                    { id: "space", type: "resolve", token: /\s+/ }
                ]
            });

            lexer.skip(2, "mode1");

            expect(lexer.position).toBe(3);
        });

        it("uses default mode by default", () => {
            const lexer = new RGXLexer("foo bar baz", {
                default: [
                    { id: "word", type: "resolve", token: /\w+/ },
                    { id: "space", type: "resolve", token: /\s+/ }
                ]
            });

            lexer.skip(2);

            expect(lexer.position).toBe(4);
        });
    });

    describe("backtrack", () => {
        it("retreats the specified number of lexemes", () => {
            const lexer = new RGXLexer("foo bar baz", {
                mode1: [
                    { id: "word", type: "resolve", token: /\w+/ },
                    { id: "space", type: "resolve", token: /\s+/ }
                ]
            });

            lexer.consume("mode1");
            lexer.consume("mode1");
            lexer.backtrack(2);

            expect(lexer.position).toBe(0);
        });

        it("removes backtracked lexemes from matched", () => {
            const lexer = new RGXLexer("foo bar baz", {
                mode1: [
                    { id: "word", type: "resolve", token: /\w+/ },
                    { id: "space", type: "resolve", token: /\s+/ }
                ]
            });

            lexer.consume("mode1");
            lexer.consume("mode1");
            lexer.backtrack(2);

            expect(lexer.matched.length).toBe(0);
        });

        it("throws RGXOutOfBoundsError if attempting to backtrack more tokens than have been matched.", () => {
            const lexer = new RGXLexer("foo bar baz", {
                mode1: [
                    { id: "word", type: "resolve", token: /\w+/ },
                    { id: "space", type: "resolve", token: /\s+/ }
                ]
            });

            expect(() => lexer.backtrack(1)).toThrow(RGXOutOfBoundsError);
        });

        it("backtracks 1 by default", () => {
            const lexer = new RGXLexer("foo bar baz", {
                mode1: [
                    { id: "word", type: "resolve", token: /\w+/ },
                    { id: "space", type: "resolve", token: /\s+/ }
                ]
            });

            lexer.consume("mode1");
            lexer.consume("mode1");

            lexer.backtrack();
            expect(lexer.matched.length).toBe(1);
        });

        it("does nothing if tokens is <= 0", () => {
            const lexer = new RGXLexer("foo bar baz", {
                mode1: [
                    { id: "word", type: "resolve", token: /\w+/ },
                    { id: "space", type: "resolve", token: /\s+/ }
                ]
            });

            lexer.consume("mode1");

            expect(() => lexer.backtrack(0)).not.toThrow();
            expect(lexer.matched.length).toBe(1);

            expect(() => lexer.backtrack(-1)).not.toThrow();
            expect(lexer.matched.length).toBe(1);
        });
    });

    describe("skipWhitespace", () => {
        it("skips space characters", () => {
            const lexer = new RGXLexer("   foo", {
                mode1: [
                    { id: "space", type: "resolve", token: /\s+/ },
                    { id: "word", type: "resolve", token: /\w+/ }
                ]
            });

            lexer.skipWhitespace();

            expect(lexer.position).toBe(3);
        });

        it("skips tab characters", () => {
            const lexer = new RGXLexer("\t\tfoo", {
                mode1: [
                    { id: "space", type: "resolve", token: /\s+/ },
                    { id: "word", type: "resolve", token: /\w+/ }
                ]
            });

            lexer.skipWhitespace();

            expect(lexer.position).toBe(2);
        });

        it("skips newline characters", () => {
            const lexer = new RGXLexer("\n\nfoo", {
                mode1: [
                    { id: "space", type: "resolve", token: /\s+/ },
                    { id: "word", type: "resolve", token: /\w+/ }
                ]
            });

            lexer.skipWhitespace();

            expect(lexer.position).toBe(2);
        });

        it("does nothing if already at the end", () => {
            const lexer = new RGXLexer("", {
                mode1: [
                    { id: "space", type: "resolve", token: /\s+/ },
                    { id: "word", type: "resolve", token: /\w+/ }
                ]
            });

            lexer.skipWhitespace();

            expect(lexer.position).toBe(0);
        });
    });

    describe("consumeAll", () => {
        it("consumes all lexemes until the end of the source and returns them as an array", () => {
            const lexer = new RGXLexer("foo bar", {
                mode1: [
                    { id: "word", type: "resolve", token: /\w+/ },
                    { id: "space", type: "resolve", token: /\s+/ }
                ]
            });

            const lexemes = lexer.consumeAll("mode1", false);

            expect(lexemes).toEqual([
                {
                    id: "word",
                    raw: "foo",
                    start: rgxLexemeLocationFromIndex("foo bar", 0),
                    end: rgxLexemeLocationFromIndex("foo bar", 3)
                },

                {
                    id: "space",
                    raw: " ",
                    start: rgxLexemeLocationFromIndex("foo bar", 3),
                    end: rgxLexemeLocationFromIndex("foo bar", 4)
                },

                {
                    id: "word",
                    raw: "bar",
                    start: rgxLexemeLocationFromIndex("foo bar", 4),
                    end: rgxLexemeLocationFromIndex("foo bar", 7)
                }
            ]);
        });

        it("returns an empty array if there are no lexemes to consume", () => {
            const lexer = new RGXLexer("", {
                mode1: [
                    { id: "word", type: "resolve", token: /\w+/ },
                    { id: "space", type: "resolve", token: /\s+/ }
                ]
            });

            const lexemes = lexer.consumeAll("mode1");

            expect(lexemes).toEqual([]);
        });

        it("uses default mode by default", () => {
            const lexer = new RGXLexer("foo", {
                default: [
                    { id: "word", type: "resolve", token: /\w+/ }
                ]
            });

            const lexemes = lexer.consumeAll();

            expect(lexemes).toEqual([
                {
                    id: "word",
                    raw: "foo",
                    start: rgxLexemeLocationFromIndex("foo", 0),
                    end: rgxLexemeLocationFromIndex("foo", 3)
                }
            ]);
        });

        it("skips whitespace by default", () => {
            const lexer = new RGXLexer("foo bar", {
                mode1: [
                    { id: "word", type: "resolve", token: /\w+/ },
                    { id: "space", type: "resolve", token: /\s+/ }
                ]
            });

            const lexemes = lexer.consumeAll("mode1");

            expect(lexemes).toEqual([
                {
                    id: "word",
                    raw: "foo",
                    start: rgxLexemeLocationFromIndex("foo bar", 0),
                    end: rgxLexemeLocationFromIndex("foo bar", 3)
                },

                {
                    id: "word",
                    raw: "bar",
                    start: rgxLexemeLocationFromIndex("foo bar", 4),
                    end: rgxLexemeLocationFromIndex("foo bar", 7)
                }
            ]);
        });
    });

    describe("consumeWhile", () => {
        it("consumes lexemes while the predicate returns true and returns them as an array", () => {
            const lexer = new RGXLexer("1 2 a 3", {
                mode1: [
                    { id: "number", type: "resolve", token: /\d+/ },
                    { id: "space", type: "resolve", token: /\s+/ },
                    { id: "word", type: "resolve", token: /\w+/ }
                ]
            });

            const lexemes = lexer.consumeWhile((lexeme) => lexeme.id === "number", "mode1");

            expect(lexemes).toEqual([
                {
                    id: "number",
                    raw: "1",
                    start: rgxLexemeLocationFromIndex("1 2 a 3", 0),
                    end: rgxLexemeLocationFromIndex("1 2 a 3", 1)
                },

                {
                    id: "number",
                    raw: "2",
                    start: rgxLexemeLocationFromIndex("1 2 a 3", 2),
                    end: rgxLexemeLocationFromIndex("1 2 a 3", 3)
                }
            ]);
        });

        it("returns an empty array if the predicate returns false for the first lexeme", () => {
            const lexer = new RGXLexer("1 2 a 3", {
                mode1: [
                    { id: "number", type: "resolve", token: /\d+/ },
                    { id: "space", type: "resolve", token: /\s+/ },
                    { id: "word", type: "resolve", token: /\w+/ }
                ]
            });

            const lexemes = lexer.consumeWhile((lexeme) => lexeme.id === "word", "mode1");
            
            expect(lexemes).toEqual([]);
        });

        it("uses default mode by default", () => {
            const lexer = new RGXLexer("1 2 a 3", {
                default: [
                    { id: "number", type: "resolve", token: /\d+/ },
                    { id: "space", type: "resolve", token: /\s+/ },
                    { id: "word", type: "resolve", token: /\w+/ }
                ]
            });

            const lexemes = lexer.consumeWhile((lexeme) => lexeme.id === "number");

            expect(lexemes).toEqual([
                {
                    id: "number",
                    raw: "1",
                    start: rgxLexemeLocationFromIndex("1 2 a 3", 0),
                    end: rgxLexemeLocationFromIndex("1 2 a 3", 1)
                },

                {
                    id: "number",
                    raw: "2",
                    start: rgxLexemeLocationFromIndex("1 2 a 3", 2),
                    end: rgxLexemeLocationFromIndex("1 2 a 3", 3)
                }
            ]);
        });

        it("skips whitespace by default", () => {
            const lexer = new RGXLexer("1 2 a 3", {
                mode1: [
                    { id: "number", type: "resolve", token: /\d+/ },
                    { id: "space", type: "resolve", token: /\s+/ },
                    { id: "word", type: "resolve", token: /\w+/ }
                ]
            });

            const lexemes = lexer.consumeWhile((lexeme) => lexeme.id === "number", "mode1");
            
            expect(lexemes).toEqual([
                {
                    id: "number",
                    raw: "1",
                    start: rgxLexemeLocationFromIndex("1 2 a 3", 0),
                    end: rgxLexemeLocationFromIndex("1 2 a 3", 1)
                },

                {
                    id: "number",
                    raw: "2",
                    start: rgxLexemeLocationFromIndex("1 2 a 3", 2),
                    end: rgxLexemeLocationFromIndex("1 2 a 3", 3)
                }
            ]);
        });
    });

    describe("consumeUntil", () => {
        it("consumes lexemes until the predicate returns true and returns them as an array", () => {
            const lexer = new RGXLexer("1 2 a 3", {
                mode1: [
                    { id: "number", type: "resolve", token: /\d+/ },
                    { id: "space", type: "resolve", token: /\s+/ },
                    { id: "word", type: "resolve", token: /\w+/ }
                ]
            });

            const lexemes = lexer.consumeUntil((lexeme) => lexeme.id === "word", "mode1");

            expect(lexemes).toEqual([
                {
                    id: "number",
                    raw: "1",
                    start: rgxLexemeLocationFromIndex("1 2 a 3", 0),
                    end: rgxLexemeLocationFromIndex("1 2 a 3", 1)
                },
                
                {
                    id: "number",
                    raw: "2",
                    start: rgxLexemeLocationFromIndex("1 2 a 3", 2),
                    end: rgxLexemeLocationFromIndex("1 2 a 3", 3)
                }
            ]);
        });

        it("returns an empty array if the predicate returns true for the first lexeme", () => {
            const lexer = new RGXLexer("1 2 a 3", {
                mode1: [
                    { id: "number", type: "resolve", token: /\d+/ },
                    { id: "space", type: "resolve", token: /\s+/ },
                    { id: "word", type: "resolve", token: /\w+/ }
                ]
            });

            const lexemes = lexer.consumeUntil((lexeme) => lexeme.id === "number", "mode1");

            expect(lexemes).toEqual([]);
        });

        it("uses default mode by default", () => {
            const lexer = new RGXLexer("1 2 a 3", {
                default: [
                    { id: "number", type: "resolve", token: /\d+/ },
                    { id: "space", type: "resolve", token: /\s+/ },
                    { id: "word", type: "resolve", token: /\w+/ }
                ]
            });

            const lexemes = lexer.consumeUntil((lexeme) => lexeme.id === "word");

            expect(lexemes).toEqual([
                {
                    id: "number",
                    raw: "1",
                    start: rgxLexemeLocationFromIndex("1 2 a 3", 0),
                    end: rgxLexemeLocationFromIndex("1 2 a 3", 1)
                },
                
                {
                    id: "number",
                    raw: "2",
                    start: rgxLexemeLocationFromIndex("1 2 a 3", 2),
                    end: rgxLexemeLocationFromIndex("1 2 a 3", 3)
                }
            ]);
        });

        it("skips whitespace by default", () => {
            const lexer = new RGXLexer("1 2 a 3", {
                mode1: [
                    { id: "number", type: "resolve", token: /\d+/ },
                    { id: "space", type: "resolve", token: /\s+/ },
                    { id: "word", type: "resolve", token: /\w+/ }
                ]
            });

            const lexemes = lexer.consumeUntil((lexeme) => lexeme.id === "word", "mode1");

            expect(lexemes).toEqual([
                {
                    id: "number",
                    raw: "1",
                    start: rgxLexemeLocationFromIndex("1 2 a 3", 0),
                    end: rgxLexemeLocationFromIndex("1 2 a 3", 1)
                },
                
                {
                    id: "number",
                    raw: "2",
                    start: rgxLexemeLocationFromIndex("1 2 a 3", 2),
                    end: rgxLexemeLocationFromIndex("1 2 a 3", 3)
                }
            ]);
        });
    });
});