import {
    atomicRegexSource, findRGXAtomicPairs, isRGXAtomicGroupName, parseRegexSource, renumberRGXAtomicGroups, rgxAtomicGroupPrefix,
    createRegexPiece, assertValidRegexReferences, finishRGXAtomicGroups, hideRGXAtomicCaptures, isFinishedRGXAtomicGroupName
} from "src/internal";
import { applyRGXPatternTransformersToSource, createRegex, ExtRegExp, isValidRegexString, RGXDuplicateGroupNameError } from "src/index";
import { expectError } from "./utils";

const placeholder = `${rgxAtomicGroupPrefix}000000`;
const pair = (inner: string) => atomicRegexSource(inner);

describe("atomic groups", () => {
    describe("atomicRegexSource", () => {
        it("wraps the source in a capturing lookahead followed by a backreference, with the placeholder name", () => {
            expect(atomicRegexSource("a+")).toBe(`(?=(?<${placeholder}>a+))\\k<${placeholder}>`);
        });
    });

    describe("isRGXAtomicGroupName", () => {
        it("recognizes names with the prefix", () => {
            expect(isRGXAtomicGroupName(placeholder)).toBe(true);
            expect(isRGXAtomicGroupName("other")).toBe(false);
            expect(isRGXAtomicGroupName(null)).toBe(false);
            expect(isRGXAtomicGroupName(undefined)).toBe(false);
        });
    });

    describe("findRGXAtomicPairs", () => {
        it("finds nothing in a source without the prefix", () => {
            expect(findRGXAtomicPairs("(a)\\1")).toEqual([]);
        });

        it("pairs sequential groups in order", () => {
            const source = `${pair("a")}${pair("b")}`;
            const pairs = findRGXAtomicPairs(source);
            expect(pairs).toHaveLength(2);
            expect(pairs[0]!.groupStart).toBe(3);
            expect(source.slice(pairs[0]!.definitionName, pairs[0]!.definitionName + placeholder.length)).toBe(placeholder);
            expect(source.slice(pairs[1]!.referenceName - 3, pairs[1]!.referenceName)).toBe("\\k<");
        });

        it("pairs nested groups like parentheses", () => {
            const inner = pair("b");
            const source = pair(`a${inner}c`);
            const pairs = findRGXAtomicPairs(source);
            expect(pairs).toHaveLength(2);
            // The outer one starts first, and its backreference is the last one.
            expect(pairs[0]!.groupStart).toBeLessThan(pairs[1]!.groupStart);
            expect(pairs[0]!.referenceName).toBeGreaterThan(pairs[1]!.referenceName);
        });

        it("skips escaped and character class text", () => {
            const fake = `\\(?=(?<${placeholder}>x))[\\k<${placeholder}>]`;
            expect(findRGXAtomicPairs(fake)).toEqual([]);
            expect(findRGXAtomicPairs(`[[(]${pair("a")}`, { unicodeSets: true })).toEqual([]);
            expect(findRGXAtomicPairs(`[[(]]${pair("a")}`, { unicodeSets: true })).toHaveLength(1);
        });

        it("leaves out definitions and backreferences without a partner, and names without the full suffix", () => {
            expect(findRGXAtomicPairs(`\\k<${placeholder}>(?=(?<${placeholder}>x))`)).toEqual([]);
            expect(findRGXAtomicPairs(`(?=(?<${rgxAtomicGroupPrefix}1>x))\\k<${rgxAtomicGroupPrefix}1>`)).toEqual([]);
        });
    });

    describe("renumberRGXAtomicGroups", () => {
        it("leaves sources without atomic groups alone", () => {
            expect(renumberRGXAtomicGroups("(a)")).toBe("(a)");
        });

        it("names each pair by its position, keeping the length", () => {
            const source = `${pair(`a${pair("b")}`)}${pair("c")}`;
            const result = renumberRGXAtomicGroups(source);
            expect(result).toHaveLength(source.length);
            expect(result).toBe(
                `(?=(?<${rgxAtomicGroupPrefix}000000>a(?=(?<${rgxAtomicGroupPrefix}000001>b))\\k<${rgxAtomicGroupPrefix}000001>))\\k<${rgxAtomicGroupPrefix}000000>` +
                `(?=(?<${rgxAtomicGroupPrefix}000002>c))\\k<${rgxAtomicGroupPrefix}000002>`
            );
            expect(() => new RegExp(result)).not.toThrow();
            // Renumbering a renumbered source changes nothing.
            expect(renumberRGXAtomicGroups(result)).toBe(result);
        });

        it("renames pairs from a pattern that was already compiled", () => {
            const compiled = renumberRGXAtomicGroups(pair("a"));
            const result = renumberRGXAtomicGroups(`${pair("b")}${compiled}`);
            expect(result).toContain(`${rgxAtomicGroupPrefix}000001>a`);
        });
    });

    describe("sources with placeholder names", () => {
        const source = `${pair("a")}${pair("b")}`;

        it("can be parsed, with positions that match the original source", () => {
            const ast = parseRegexSource(source);
            expect(ast).not.toBeNull();
            const group = ast!.alternatives[0]!.elements[0]!;
            expect(source.slice(group.start, group.end)).toBe(`(?=(?<${placeholder}>a))`);
        });

        it("are valid pieces and regex strings", () => {
            expect(() => createRegexPiece(source)).not.toThrow();
            expect(() => createRegexPiece(source, "v")).not.toThrow();
            expect(isValidRegexString(source)).toBe(true);
        });

        it("compile with unique names", () => {
            expect(createRegex(source).test("ab")).toBe(true);
            expect(createRegex(source, "v").test("ab")).toBe(true);
            const ext = new ExtRegExp(source);
            expect(ext.source).toContain(`${rgxAtomicGroupPrefix}final_1`);
            expect(createRegex(source).source).toContain(`${rgxAtomicGroupPrefix}final_1`);
            expect(ext.test("ab")).toBe(true);
        });

        it("are given unique names before pattern transformers see them", () => {
            expect(applyRGXPatternTransformersToSource(source)).toContain(`${rgxAtomicGroupPrefix}final_1`);
        });

        it("report duplicate names that aren't atomic groups", () => {
            expectError(
                () => assertValidRegexReferences(`${source}(?<x>a)(?<x>b)`, []),
                RGXDuplicateGroupNameError,
                e => expect(e.groupName).toBe("x")
            );
        });
    });

    describe("finishRGXAtomicGroups", () => {
        it("leaves sources without atomic groups alone", () => {
            expect(finishRGXAtomicGroups("(a)\\1")).toEqual({ source: "(a)\\1", atomicGroups: [], atomicGroupNames: [] });
        });

        it("gives atomic groups final names and numeric references their final numbers", () => {
            const result = finishRGXAtomicGroups(`${pair("a")}(b)${pair("(c)")}\\1\\2\\k<x>(?<x>d)\\4\\3`);
            const name = (n: number) => `${rgxAtomicGroupPrefix}final_${n}`;
            expect(result.source).toBe(`(?=(?<${name(0)}>a))\\k<${name(0)}>(b)(?=(?<${name(1)}>(c)))\\k<${name(1)}>\\2\\4\\k<x>(?<x>d)\\4\\5`);
            expect(result.atomicGroups).toEqual([1, 3]);
            expect(result.atomicGroupNames).toEqual([name(0), name(1)]);
            // Finished names aren't placeholders, so finishing again changes nothing.
            expect(finishRGXAtomicGroups(result.source).source).toBe(result.source);
            expect(isFinishedRGXAtomicGroupName(name(0))).toBe(true);
            expect(isFinishedRGXAtomicGroupName(placeholder)).toBe(false);
        });

        it("doesn't repeat final names already in the source", () => {
            const finished = finishRGXAtomicGroups(pair("a")).source;
            expect(finishRGXAtomicGroups(finished + pair("b")).atomicGroupNames).toEqual([`${rgxAtomicGroupPrefix}final_1`]);
        });

        it("only renames the atomic groups of an invalid source", () => {
            expect(finishRGXAtomicGroups(`${pair("a")}${pair("b")}(`)).toEqual({
                source: renumberRGXAtomicGroups(`${pair("a")}${pair("b")}(`), atomicGroups: [], atomicGroupNames: []
            });
        });
    });

    describe("hideRGXAtomicCaptures", () => {
        it("takes the atomic groups out of a match, its groups and its indices", () => {
            const { source, atomicGroups, atomicGroupNames } = finishRGXAtomicGroups(`${pair("a")}(?<b>b)`);
            const match = hideRGXAtomicCaptures(new RegExp(source, "d").exec("ab")!, atomicGroups, atomicGroupNames);
            expect([...match]).toEqual(["ab", "b"]);
            expect(match.groups).toEqual({ b: "b" });
            const indices = (match as unknown as { indices: [number, number][] & { groups: object } }).indices;
            expect([...indices]).toEqual([[0, 2], [1, 2]]);
            expect(indices.groups).toEqual({ b: [1, 2] });
        });

        it("leaves groups undefined when only atomic groups were named", () => {
            const { source, atomicGroups, atomicGroupNames } = finishRGXAtomicGroups(`${pair("a")}(b)`);
            const match = hideRGXAtomicCaptures(new RegExp(source).exec("ab")!, atomicGroups, atomicGroupNames);
            expect([...match]).toEqual(["ab", "b"]);
            expect(match.groups).toBeUndefined();
        });

        it("leaves matches alone without atomic groups", () => {
            const match = /a/.exec("a")!;
            expect(hideRGXAtomicCaptures(match, [], [])).toBe(match);
        });
    });
});
