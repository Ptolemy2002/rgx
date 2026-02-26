import { RGXClassUnionToken, RGXGroupToken, RGXClassWrapperToken, toRGXClassToken } from "src/class";
import { RGXTokenCollection } from "src/collection";

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
        expect((classToken as RGXClassUnionToken).tokens.toArray()).toEqual(token);
    });

    it('converts a collection token in union mode to a RGXClassUnionToken', () => {
        const collection = new RGXTokenCollection(['a', 'b', 'c'], 'union');
        const classToken = toRGXClassToken(collection);
        expect(classToken).toBeInstanceOf(RGXClassUnionToken);
        expect((classToken as RGXClassUnionToken).tokens.toArray()).toEqual(['a', 'b', 'c']);
    });

    it('converts a collection token in concat mode to a RGXGroupToken', () => {
        const collection = new RGXTokenCollection(['a', 'b', 'c'], 'concat');
        const classToken = toRGXClassToken(collection);
        expect(classToken).toBeInstanceOf(RGXGroupToken);
        expect((classToken as RGXGroupToken).tokens.toArray()).toEqual(['a', 'b', 'c']);
    });

    it('wraps other tokens in a RGXClassWrapperToken', () => {
        const token = 'native';
        const classToken = toRGXClassToken(token);
        expect(classToken).toBeInstanceOf(RGXClassWrapperToken);
        expect((classToken as RGXClassWrapperToken).token).toEqual(token);
    });
});