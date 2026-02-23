import { normalizeVanillaRegexFlags, RGXInvalidVanillaRegexFlagsError } from 'src/index';

describe('normalizeVanillaRegexFlags', () => {
    it('leaves valid flags unchanged', () => {
        expect(normalizeVanillaRegexFlags('g')).toBe('g');
        expect(normalizeVanillaRegexFlags('i')).toBe('i');
        expect(normalizeVanillaRegexFlags('m')).toBe('m');
        expect(normalizeVanillaRegexFlags('s')).toBe('s');
        expect(normalizeVanillaRegexFlags('u')).toBe('u');
        expect(normalizeVanillaRegexFlags('y')).toBe('y');
        expect(normalizeVanillaRegexFlags('gim')).toBe('gim');
        expect(normalizeVanillaRegexFlags('gimsuy')).toBe('gimsuy');
    });

    it('leaves an empty string unchanged', () => {
        expect(normalizeVanillaRegexFlags('')).toBe('');
    });

    it('rejects invalid flags', () => {
        expect(() => normalizeVanillaRegexFlags('x')).toThrow(RGXInvalidVanillaRegexFlagsError);
        expect(() => normalizeVanillaRegexFlags('gix')).toThrow(RGXInvalidVanillaRegexFlagsError);
        expect(() => normalizeVanillaRegexFlags('abc')).toThrow(RGXInvalidVanillaRegexFlagsError);
    });

    it('removes duplicate flags', () => {
        expect(normalizeVanillaRegexFlags('gg')).toBe('g');
        expect(normalizeVanillaRegexFlags('gimim')).toBe('gim');
        expect(normalizeVanillaRegexFlags('ggimsuyy')).toBe('gimsuy');
    });
});