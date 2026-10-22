import { RGXClassUnionToken, RGXClassWrapperToken, toRGXClassToken } from "src/class";

describe('toRGXClassToken', () => {
    it('returns RGXClassToken instances as-is', () => {
        const token = new RGXClassUnionToken(['a', 'b', 'c']);
        const classToken = toRGXClassToken(token);
        expect(classToken).toBe(token);
    });

    it('converts an array token to a RGXClassUnionToken', () => {
        const token = ['a', 'b', 'c'];
        const classToken = toRGXClassToken(token);
        expect(classToken).toBeInstanceOf(RGXClassUnionToken);
        expect((classToken as RGXClassUnionToken).tokens).toEqual(token);
    });

    it("doesn't call the toRgx() of an array's members", () => {
        const toRgx = jest.fn(() => 'a');
        expect(toRGXClassToken([{ toRgx }, 'b'])).toBeInstanceOf(RGXClassUnionToken);
        expect(toRgx).not.toHaveBeenCalled();
    });

    it('wraps other tokens in a RGXClassWrapperToken', () => {
        const token = 'native';
        const classToken = toRGXClassToken(token);
        expect(classToken).toBeInstanceOf(RGXClassWrapperToken);
        expect((classToken as RGXClassWrapperToken).token).toEqual(token);
    });
});