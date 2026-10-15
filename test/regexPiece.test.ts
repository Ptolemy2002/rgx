import { RGXInvalidRegexStringError } from "src/errors";
import { assertValidRegexPiece, createRegexPiece, regexPieceFlags } from "src/internal/regexPiece";

describe("regexPieceFlags", () => {
    it("keeps only the localizable and unicode flags", () => {
        expect(regexPieceFlags("")).toBe("");
        expect(regexPieceFlags("dgimsuy")).toBe("imsu");
        expect(regexPieceFlags("vsa")).toBe("sv");
    });
});

describe("createRegexPiece", () => {
    it("compiles the piece with the flags in effect", () => {
        const piece = createRegexPiece("[\\p{L}--[a-z]]", "giv");
        expect(piece.flags).toBe("iv");
        expect(piece.test("é")).toBe(true);
        expect(createRegexPiece("a").flags).toBe("");
    });

    it("compiles pieces that are only invalid on their own with the u or v flag without it", () => {
        // A backreference to a group outside of the piece.
        const piece = createRegexPiece("\\1", "iu");
        expect(piece.source).toBe("\\1");
        expect(piece.flags).toBe("i");
    });

    it("compiles pieces that are only valid with the u or v flag with it, when it isn't in effect", () => {
        expect(createRegexPiece("\\p{L}{2}").flags).toBe("");
        expect(createRegexPiece("[\\p{L}--[a-z]]", "i").flags).toBe("iv");
    });

    it("throws for pieces that are invalid either way", () => {
        expect(() => createRegexPiece("a**", "u")).toThrow(RGXInvalidRegexStringError);
        expect(() => createRegexPiece("a**")).toThrow(RGXInvalidRegexStringError);
        expect(() => assertValidRegexPiece("a**")).toThrow(RGXInvalidRegexStringError);
        expect(() => assertValidRegexPiece("a")).not.toThrow();
    });
});
