import { normalizeVanillaRegexFlags, normalizeRegexFlags, RGXInvalidVanillaRegexFlagsError, registerFlagTransformer, unregisterFlagTransformer } from 'src/index';

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

describe('normalizeRegexFlags', () => {
    it('accepts all vanilla regex flags', () => {
        expect(normalizeRegexFlags('g')).toBe('g');
        expect(normalizeRegexFlags('i')).toBe('i');
        expect(normalizeRegexFlags('m')).toBe('m');
        expect(normalizeRegexFlags('s')).toBe('s');
        expect(normalizeRegexFlags('u')).toBe('u');
        expect(normalizeRegexFlags('y')).toBe('y');
    });

    it('accepts a custom flag', () => {
        registerFlagTransformer('x', (regex) => regex);

        expect(normalizeRegexFlags('gx')).toBe('gx');
        expect(normalizeRegexFlags('ix')).toBe('ix');
        expect(normalizeRegexFlags('mx')).toBe('mx');
        expect(normalizeRegexFlags('sx')).toBe('sx');
        expect(normalizeRegexFlags('ux')).toBe('ux');
        expect(normalizeRegexFlags('yx')).toBe('yx');
        
        unregisterFlagTransformer('x');
    });

    it('leaves an empty string unchanged', () => {
        expect(normalizeRegexFlags('')).toBe('');
    });

    it('rejects invalid flags', () => {
        expect(() => normalizeRegexFlags('z')).toThrow();
        expect(() => normalizeRegexFlags('gz')).toThrow();
        expect(() => normalizeRegexFlags('abc')).toThrow();
    });

    it('removes duplicate flags', () => {
        expect(normalizeRegexFlags('gg')).toBe('g');
        expect(normalizeRegexFlags('gimim')).toBe('gim');
        expect(normalizeRegexFlags('ggimsuyy')).toBe('gimsuy');
    });
});