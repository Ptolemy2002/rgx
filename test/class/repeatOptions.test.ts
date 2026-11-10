import { RGXClassToken, RGXClassUnionToken, RGXGroupToken, RGXLookaheadToken, RGXRepeatToken, rgxRepeat } from "src/class";
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

describe("RGXRepeatToken options", () => {
    it("accepts an options object in place of the lazy and possessive flags", () => {
        const token = new RGXRepeatToken("a", 2, 5, { lazy: true, possessive: true, perOption: true, inner: true });
        expect(token.lazy).toBe(true);
        expect(token.possessive).toBe(true);
        expect(token.perOption).toBe(true);
        expect(token.inner).toBe(true);
        expect(token.options).toEqual({ lazy: true, possessive: true, perOption: true, inner: true });

        const defaults = rgxRepeat("a", 2, 5, {});
        expect(defaults.options).toEqual({ lazy: false, possessive: false, perOption: false, inner: false });

        const flags = new RGXRepeatToken("a", 2, 5, true, true);
        expect(flags.options).toEqual({ lazy: true, possessive: true, perOption: false, inner: false });
    });

    it("keeps the options when cloned", () => {
        const token = new RGXRepeatToken(["a", "b"], 2, 5, { perOption: true, inner: true, lazy: true });
        const clone = token.clone();
        expect(clone).not.toBe(token);
        expect(clone.options).toEqual(token.options);
        expect(clone.resolve()).toBe(token.resolve());
    });

    it("stores perOption and inner in JSON only when they are set", () => {
        expect(new RGXRepeatToken("a", 1, 2).toJSON().args).toEqual(["a", 1, 2, false]);
        expect(new RGXRepeatToken(["a", "b"], 1, 2, { perOption: true }).toJSON().args).toEqual([["a", "b"], 1, 2, false, false, true]);
        expect(new RGXRepeatToken("a", 1, 2, { inner: true }).toJSON().args).toEqual(["a", 1, 2, false, false, false, true]);

        const token = new RGXRepeatToken(["a", "b"], 1, 2, { perOption: true, inner: true });
        const restored = RGXRepeatToken.fromJSON(token.toJSON());
        expect(restored.options).toEqual(token.options);
        expect(restored.resolve()).toBe(token.resolve());

        expect(RGXRepeatToken.fromJSON({ $rgx: true, class: "RGXRepeatToken", args: ["a"] }).options)
            .toEqual({ lazy: false, possessive: false, perOption: false, inner: false });
        expect(() => RGXRepeatToken.fromJSON({ $rgx: true, class: "RGXRepeatToken", args: ["a", 1, 1, false, false, "x"] })).toThrow(/perOption/);
        expect(() => RGXRepeatToken.fromJSON({ $rgx: true, class: "RGXRepeatToken", args: ["a", 1, 1, false, false, false, "x"] })).toThrow(/inner/);
    });

    describe("perOption", () => {
        it("repeats each option of a union", () => {
            const union = new RGXClassUnionToken(["a", /bc/, testToken1]);
            const result = union.repeat(2, null, { perOption: true, lazy: true });
            expect(result).toBeInstanceOf(RGXRepeatToken);
            expect(result.token).toBe(union);
            expect(result.perOption).toBe(true);
            expect(rgxa([result]).source).toBe("a{2,}?|(?:bc){2,}?|(?:test){2,}?");
        });

        it("repeats each option of an array", () => {
            expect(rgxa([new RGXRepeatToken(["a", ["b", "c"]], 1, null, { perOption: true })]).source).toBe("a+|b+|c+");
            // An array with one option is repeated the same way as without the option.
            expect(rgxa([new RGXRepeatToken(["ab"], 2, 2, { perOption: true })]).source).toBe("(?:ab){2}");
        });

        it("matches repeats of one option only", () => {
            const regex = rgxa([new RGXClassUnionToken(["a", "b"]).repeat(1, null, { perOption: true })]);
            expect(regex.source).toBe("a+|b+");
            expect("aab".match(regex)?.[0]).toBe("aa");

            const plain = rgxa([new RGXClassUnionToken(["a", "b"]).repeat(1, null)]);
            expect("aab".match(plain)?.[0]).toBe("aab");
        });

        it("passes the options on to the options", () => {
            const group = new RGXGroupToken({ name: "x" }, "a");
            const union = new RGXClassUnionToken([group, "b"]);
            expect(rgxa([union.repeat(2, 2, { perOption: true, inner: true })]).source).toBe("(?<x>a{2})|b{2}");
            expect(rgxa([union.repeat(2, 2, { perOption: true })]).source).toBe("(?<x>a){2}|b{2}");
        });

        it("applies at resolve time, so later changes to the repeat are used", () => {
            const token = new RGXRepeatToken(["a", "b"], 2, 2);
            expect(rgxa([token]).source).toBe("(?:a|b){2}");
            token.perOption = true;
            token.min = 1;
            token.max = null;
            expect(rgxa([token]).source).toBe("a+|b+");
        });

        it("repeats tokens other than unions as a whole", () => {
            expect(rgxa([testToken1.repeat(2, 2, { perOption: true })]).source).toBe("(?:test){2}");
            expect(rgxa([new RGXRepeatToken(/a|b/, 2, 2, { perOption: true })]).source).toBe("(?:a|b){2}");
        });

        it("repeats an empty union as a whole", () => {
            const union = new RGXClassUnionToken([]);
            expect(rgxa([union.repeat(2, 2, { perOption: true })]).source).toBe(rgxa([union.repeat(2, 2)]).source);
        });

        it("throws when an option can't be repeated", () => {
            const union = new RGXClassUnionToken(["a", new RGXLookaheadToken(["b"])]);
            expect(() => union.repeat(2, 2, { perOption: true })).toThrow(RGXNotSupportedError);

            const token = union.repeat(2, 2);
            expect(() => { token.perOption = true; }).toThrow(RGXNotSupportedError);
            expect(token.perOption).toBe(false);

            const perOption = new RGXRepeatToken("a", 2, 2, { perOption: true });
            expect(() => { perOption.token = union; }).toThrow(RGXNotSupportedError);
            expect(perOption.token).toBe("a");
        });
    });

    describe("inner", () => {
        it("repeats the contents of a named group inside it", () => {
            const group = new RGXGroupToken({ name: "x", aliases: ["y"], flags: "i" }, ["a", "b"]);
            const result = group.repeat(2, 3, { inner: true, lazy: true });
            expect(result).toBeInstanceOf(RGXRepeatToken);
            expect(result.token).toBe(group);
            expect(result.inner).toBe(true);

            expect(rgxa([result]).source).toBe("(?i:(?<x>(?<y>(?:ab){2,3}?)))");
            // The original group is left alone.
            expect(group.tokens).toEqual(["a", "b"]);
        });

        it("captures every repetition instead of only the last", () => {
            const group = new RGXGroupToken({ name: "x" }, /\d/);
            expect("123".match(rgxa([group.repeat(1, null, { inner: true })]))?.groups?.x).toBe("123");
            expect(rgxa([group.repeat(1, null, { inner: true })]).source).toBe("(?<x>\\d+)");
            expect("123".match(rgxa([group.repeat(1, null)]))?.groups?.x).toBe("3");
        });

        it("applies to unnamed capturing groups", () => {
            const group = new RGXGroupToken({}, ["a", "b"]);
            expect(rgxa([group.repeat(2, 2, { inner: true })]).source).toBe("((?:ab){2})");
        });

        it("repeats non-capturing groups and other tokens as a whole", () => {
            const group = new RGXGroupToken({ capturing: false }, ["a", "b"]);
            expect(rgxa([group.repeat(2, 2, { inner: true })]).source).toBe("(?:ab){2}");
            expect(rgxa([testToken1.repeat(2, 2, { inner: true })]).source).toBe("(?:test){2}");
        });

        it("keeps each repetition of an atomic group atomic", () => {
            const group = new RGXGroupToken({ name: "x", atomic: true }, ["a", "b"]);
            const result = group.repeat(2, 2, { inner: true });
            expect(result.resolve()).toBe(new RGXGroupToken({ name: "x" }, [
                new RGXRepeatToken(new RGXGroupToken({ capturing: false, atomic: true }, ["a", "b"]), 2, 2)
            ]).resolve());
            expect(group.isAtomic).toBe(true);
            expect("abab".match(rgxa([result]))?.groups?.x).toBe("abab");
        });

        it("keeps a possessive repetition inside the group", () => {
            const group = new RGXGroupToken({ name: "x" }, "a");
            expect(group.repeat(1, null, { inner: true, possessive: true }).resolve())
                .toBe(new RGXGroupToken({ name: "x" }, [new RGXRepeatToken("a", 1, null, { possessive: true })]).resolve());
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

    it("keeps perOption when relaxing the minimum of a repeat", () => {
        const relaxed = new RGXClassUnionToken(["a", "b"]).repeat(1, null, { perOption: true }).optional();
        expect(relaxed.perOption).toBe(true);
        expect(rgxa([relaxed]).source).toBe("a*|b*");
    });

    it("wraps a repeat of a group's contents instead of relaxing its minimum", () => {
        const repeat = new RGXGroupToken({ name: "x" }, "a").repeat(1, null, { inner: true });
        const result = repeat.optional();
        expect(result.token).toBe(repeat);
        // The group doesn't take part in the match when nothing matches.
        expect("".match(rgxa([result]))?.groups?.x).toBeUndefined();
    });
});
