import {
    atomicRegexSource, findRGXAtomicPairs, isRGXAtomicGroupName, parseRegexSource, renumberRGXAtomicGroups, rgxAtomicGroupPrefix,
    createRegexPiece, assertValidRegexReferences
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
            expect(ext.source).toContain(`${rgxAtomicGroupPrefix}000001`);
            expect(ext.test("ab")).toBe(true);
        });

        it("are given unique names before pattern transformers see them", () => {
            expect(applyRGXPatternTransformersToSource(source)).toContain(`${rgxAtomicGroupPrefix}000001`);
        });

        it("report duplicate names that aren't atomic groups", () => {
            expectError(
                () => assertValidRegexReferences(`${source}(?<x>a)(?<x>b)`, []),
                RGXDuplicateGroupNameError,
                e => expect(e.groupName).toBe("x")
            );
        });
    });
});
