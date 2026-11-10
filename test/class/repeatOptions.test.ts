import { RGXClassToken, RGXClassUnionToken, RGXGroupToken, RGXLookaheadToken, RGXRepeatToken } from "src/class";
import { RGXNotSupportedError } from "src/errors";
import { rgxa } from "src/index";

class TestClassToken extends RGXClassToken {
    toRgx() {
        return "test";
    }

    clone() {
        return new TestClassToken();
    }
}

const testToken1 = new TestClassToken();

describe("RGXClassToken.repeat options", () => {
    it("accepts lazy and possessive in an options object", () => {
        const result = testToken1.repeat(2, 5, { lazy: true, possessive: true });
        expect(result).toBeInstanceOf(RGXRepeatToken);
        expect(result.token).toBe(testToken1);
        expect(result.lazy).toBe(true);
        expect(result.possessive).toBe(true);

        const defaults = testToken1.repeat(2, 5, {});
        expect(defaults.lazy).toBe(false);
        expect(defaults.possessive).toBe(false);
    });

    describe("perOption", () => {
        it("repeats each option of a union", () => {
            const union = new RGXClassUnionToken(["a", /bc/, testToken1]);
            const result = union.repeat(2, null, { perOption: true, lazy: true });
            expect(result).toBeInstanceOf(RGXClassUnionToken);

            const tokens = (result as RGXClassUnionToken).tokens as RGXRepeatToken[];
            expect(tokens).toHaveLength(3);
            for (const [i, token] of tokens.entries()) {
                expect(token).toBeInstanceOf(RGXRepeatToken);
                expect(token.token).toBe(union.tokens[i]);
                expect(token.min).toBe(2);
                expect(token.max).toBe(null);
                expect(token.lazy).toBe(true);
            }

            expect(rgxa([result]).source).toBe("a{2,}?|(?:bc){2,}?|(?:test){2,}?");
        });

        it("matches repeats of one option only", () => {
            const regex = rgxa([new RGXClassUnionToken(["a", "b"]).repeat(1, null, { perOption: true })]);
            expect(regex.source).toBe("a+|b+");
            expect("aab".match(regex)?.[0]).toBe("aa");

            const plain = rgxa([new RGXClassUnionToken(["a", "b"]).repeat(1, null)]);
            expect("aab".match(plain)?.[0]).toBe("aab");
        });

        it("passes the options on to class tokens among the options", () => {
            const group = new RGXGroupToken({ name: "x" }, "a");
            const union = new RGXClassUnionToken([group, "b"]);
            expect(rgxa([union.repeat(2, 2, { perOption: true, inner: true })]).source).toBe("(?<x>a{2})|b{2}");
            expect(rgxa([union.repeat(2, 2, { perOption: true })]).source).toBe("(?<x>a){2}|b{2}");
        });

        it("repeats a union as a whole without the option", () => {
            const union = new RGXClassUnionToken(["a", "b"]);
            const result = union.repeat(2, 2, { perOption: false });
            expect(result).toBeInstanceOf(RGXRepeatToken);
            expect((result as RGXRepeatToken).token).toBe(union);
        });

        it("repeats tokens other than unions as usual", () => {
            const result = testToken1.repeat(2, 2, { perOption: true });
            expect(result).toBeInstanceOf(RGXRepeatToken);
            expect((result as RGXRepeatToken).token).toBe(testToken1);
        });

        it("repeats an empty union as a whole", () => {
            const union = new RGXClassUnionToken([]);
            const result = union.repeat(2, 2, { perOption: true });
            expect(result).toBeInstanceOf(RGXRepeatToken);
            expect((result as RGXRepeatToken).token).toBe(union);
        });

        it("throws when an option can't be repeated", () => {
            const union = new RGXClassUnionToken(["a", new RGXLookaheadToken(["b"])]);
            expect(() => union.repeat(2, 2, { perOption: true })).toThrow(RGXNotSupportedError);
        });
    });

    describe("inner", () => {
        it("repeats the contents of a named group inside it", () => {
            const group = new RGXGroupToken({ name: "x", aliases: ["y"], flags: "i" }, ["a", "b"]);
            const result = group.repeat(2, 3, { inner: true, lazy: true });
            expect(result).toBeInstanceOf(RGXGroupToken);
            expect(result).not.toBe(group);

            const copy = result as RGXGroupToken;
            expect(copy.name).toBe("x");
            expect(copy.aliases).toEqual(["y"]);
            expect(copy.flags).toBe("i");
            expect(copy.tokens).toHaveLength(1);

            const repeat = copy.tokens[0] as RGXRepeatToken;
            expect(repeat).toBeInstanceOf(RGXRepeatToken);
            expect(repeat.min).toBe(2);
            expect(repeat.max).toBe(3);
            expect(repeat.lazy).toBe(true);

            // The original group is left alone.
            expect(group.tokens).toEqual(["a", "b"]);
            expect(rgxa([result]).source).toBe("(?i:(?<x>(?<y>(?:ab){2,3}?)))");
        });

        it("captures every repetition instead of only the last", () => {
            const group = new RGXGroupToken({ name: "x" }, /\d/);
            expect("123".match(rgxa([group.repeat(1, null, { inner: true })]))?.groups?.x).toBe("123");
            expect(rgxa([group.repeat(1, null, { inner: true })]).source).toBe("(?<x>\\d+)");
            expect("123".match(rgxa([group.repeat(1, null)]))?.groups?.x).toBe("3");
        });

        it("leaves out the group around a single token that doesn't need one", () => {
            const group = new RGXGroupToken({ name: "x" }, "a");
            expect(rgxa([group.repeat(2, 2, { inner: true })]).source).toBe("(?<x>a{2})");
        });

        it("applies to unnamed capturing groups", () => {
            const group = new RGXGroupToken({}, ["a", "b"]);
            expect(rgxa([group.repeat(2, 2, { inner: true })]).source).toBe("((?:ab){2})");
        });

        it("repeats non-capturing groups as a whole", () => {
            const group = new RGXGroupToken({ capturing: false }, ["a", "b"]);
            const result = group.repeat(2, 2, { inner: true });
            expect(result).toBeInstanceOf(RGXRepeatToken);
            expect((result as RGXRepeatToken).token).toBe(group);
        });

        it("keeps each repetition of an atomic group atomic", () => {
            const group = new RGXGroupToken({ name: "x", atomic: true }, ["a", "b"]);
            const copy = group.repeat(2, 2, { inner: true }) as RGXGroupToken;
            expect(copy.isAtomic).toBe(false);

            const contents = (copy.tokens[0] as RGXRepeatToken).token as RGXGroupToken;
            expect(contents).toBeInstanceOf(RGXGroupToken);
            expect(contents.isAtomic).toBe(true);
            expect(contents.capturing).toBe(false);
            expect(contents.tokens).toEqual(["a", "b"]);

            expect("abab".match(rgxa([copy]))?.groups?.x).toBe("abab");
        });

        it("repeats tokens other than groups as usual", () => {
            const result = testToken1.repeat(2, 2, { inner: true });
            expect(result).toBeInstanceOf(RGXRepeatToken);
            expect((result as RGXRepeatToken).token).toBe(testToken1);
        });
    });
});

describe("RGXClassToken.optional options", () => {
    it("accepts an options object", () => {
        const result = testToken1.optional({ lazy: true });
        expect(result).toBeInstanceOf(RGXRepeatToken);
        expect(result.lazy).toBe(true);
        expect(result.min).toBe(0);
        expect(result.max).toBe(1);

        const repeatToken = testToken1.repeat(1, 2);
        const relaxed = repeatToken.optional({ lazy: true });
        expect(relaxed.token).toBe(testToken1);
        expect(relaxed.lazy).toBe(true);

        const wrapped = repeatToken.optional({ possessive: true });
        expect(wrapped.token).toBe(repeatToken);
        expect(wrapped.possessive).toBe(true);
    });

    it("passes perOption and inner on", () => {
        expect(rgxa([new RGXClassUnionToken(["a", "b"]).optional({ perOption: true })]).source).toBe("a?|b?");
        const group = new RGXGroupToken({ name: "x" }, "a");
        const result = group.optional({ inner: true });
        expect(rgxa([result]).source).toBe("(?<x>a?)");
        // The group always takes part in the match, so it captures an empty string instead of being undefined.
        expect("".match(rgxa([result]))?.groups?.x).toBe("");
    });
});
