import { RGXClassWrapperToken, RGXSubpatternToken, toRGXClassToken, ExtRegExp } from "src/index";

describe('toRGXClassToken with JSON tokens', () => {
    it('converts JSON class tokens to their class token', () => {
        const classToken = toRGXClassToken({ $rgx: true, class: "RGXSubpatternToken", args: [1] });
        expect(classToken).toBeInstanceOf(RGXSubpatternToken);
    });

    it('wraps JSON literal tokens as literal tokens', () => {
        const classToken = toRGXClassToken({ $rgx: true, source: "abc" });
        expect(classToken).toBeInstanceOf(RGXClassWrapperToken);
        expect((classToken as RGXClassWrapperToken).token).toBeInstanceOf(ExtRegExp);
    });
});
