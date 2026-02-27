import { RGXClassWrapperToken } from "src/class";
import { cloneRGXToken } from "src/clone";

describe("cloneRGXToken", () => {
    it("leaves a no-op token unchanged", () => {
        const token1 = null;
        const token2 = undefined;
        expect(cloneRGXToken(token1)).toBe(token1);
        expect(cloneRGXToken(token2)).toBe(token2);
    });

    it("leaves a native token unchanged", () => {
        const token1 = "test";
        const token2 = 14;
        const token3 = true;

        expect(cloneRGXToken(token1)).toBe(token1);
        expect(cloneRGXToken(token2)).toBe(token2);
        expect(cloneRGXToken(token3)).toBe(token3);
    });

    it("clones a literal or class token when depth is not 0", () => {
        const token1 = /test/;
        const token2 = new RGXClassWrapperToken("test");

        const clone1 = cloneRGXToken(token1);
        const clone2 = cloneRGXToken(token2);

        expect(clone1).not.toBe(token1);
        expect(clone1).toEqual(token1);

        expect(clone2).not.toBe(token2);
        expect(clone2.token).toEqual(token2.token);
    });

    it("leves a literal or class token unchanged when depth is 0", () => {
        const token1 = /test/;
        const token2 = new RGXClassWrapperToken("test");

        const clone1 = cloneRGXToken(token1, 0);
        const clone2 = cloneRGXToken(token2, 0);

        expect(clone1).toBe(token1);
        expect(clone2).toBe(token2);
    });
});