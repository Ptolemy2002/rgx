import { isValidVanillaRegexFlags, assertValidVanillaRegexFlags, RGXInvalidVanillaRegexFlagsError } from 'src/index';

describe('isValidVanillaRegexFlags', () => {
    it('accepts an empty string', () => {
        expect(isValidVanillaRegexFlags('')).toBe(true);
    });

    it('accepts singular valid regex flags', () => {
        expect(isValidVanillaRegexFlags('g')).toBe(true);
        expect(isValidVanillaRegexFlags('i')).toBe(true);
        expect(isValidVanillaRegexFlags('m')).toBe(true);
        expect(isValidVanillaRegexFlags('s')).toBe(true);
        expect(isValidVanillaRegexFlags('u')).toBe(true);
        expect(isValidVanillaRegexFlags('y')).toBe(true);
        expect(isValidVanillaRegexFlags('d')).toBe(true);
        expect(isValidVanillaRegexFlags('v')).toBe(true);

        expect(() => assertValidVanillaRegexFlags('g')).not.toThrow();
        expect(() => assertValidVanillaRegexFlags('i')).not.toThrow();
        expect(() => assertValidVanillaRegexFlags('m')).not.toThrow();
        expect(() => assertValidVanillaRegexFlags('s')).not.toThrow();
        expect(() => assertValidVanillaRegexFlags('u')).not.toThrow();
        expect(() => assertValidVanillaRegexFlags('y')).not.toThrow();
        expect(() => assertValidVanillaRegexFlags('d')).not.toThrow();
        expect(() => assertValidVanillaRegexFlags('v')).not.toThrow();
    });

    it('accepts combinations of valid regex flags', () => {
        expect(isValidVanillaRegexFlags('gi')).toBe(true);
        expect(isValidVanillaRegexFlags('gimsuydv')).toBe(true);
        expect(isValidVanillaRegexFlags('yms')).toBe(true);

        expect(() => assertValidVanillaRegexFlags('gi')).not.toThrow();
        expect(() => assertValidVanillaRegexFlags('gimsuydv')).not.toThrow();
        expect(() => assertValidVanillaRegexFlags('yms')).not.toThrow();
    });

    it('rejects singular invalid regex flags', () => {
        expect(isValidVanillaRegexFlags('x')).toBe(false);
        expect(isValidVanillaRegexFlags('z')).toBe(false);
        expect(isValidVanillaRegexFlags('a')).toBe(false);

        expect(() => assertValidVanillaRegexFlags('x')).toThrow(RGXInvalidVanillaRegexFlagsError);
        expect(() => assertValidVanillaRegexFlags('z')).toThrow(RGXInvalidVanillaRegexFlagsError);
        expect(() => assertValidVanillaRegexFlags('a')).toThrow(RGXInvalidVanillaRegexFlagsError);
    });

    it('rejects combinations of valid and invalid regex flags', () => {
        expect(isValidVanillaRegexFlags('gix')).toBe(false);
        expect(isValidVanillaRegexFlags('gimsuydvz')).toBe(false);
        expect(isValidVanillaRegexFlags('ymas')).toBe(false);

        expect(() => assertValidVanillaRegexFlags('gix')).toThrow(RGXInvalidVanillaRegexFlagsError);
        expect(() => assertValidVanillaRegexFlags('gimsuydvz')).toThrow(RGXInvalidVanillaRegexFlagsError);
        expect(() => assertValidVanillaRegexFlags('ymas')).toThrow(RGXInvalidVanillaRegexFlagsError);
    });

    it('rejects strings with non-flag characters', () => {
        expect(isValidVanillaRegexFlags('gi ')).toBe(false);
        expect(isValidVanillaRegexFlags('gim-suydv')).toBe(false);
        expect(isValidVanillaRegexFlags('yms!')).toBe(false);

        expect(() => assertValidVanillaRegexFlags('gi ')).toThrow(RGXInvalidVanillaRegexFlagsError);
        expect(() => assertValidVanillaRegexFlags('gim-suydv')).toThrow(RGXInvalidVanillaRegexFlagsError);
        expect(() => assertValidVanillaRegexFlags('yms!')).toThrow(RGXInvalidVanillaRegexFlagsError);
    });

    it('rejects strings with repeated flags', () => {
        expect(isValidVanillaRegexFlags('gg')).toBe(false);
        expect(isValidVanillaRegexFlags('gii')).toBe(false);
        expect(isValidVanillaRegexFlags('mm')).toBe(false);
        expect(isValidVanillaRegexFlags('ss')).toBe(false);
        expect(isValidVanillaRegexFlags('uu')).toBe(false);
        expect(isValidVanillaRegexFlags('yy')).toBe(false);
        expect(isValidVanillaRegexFlags('dd')).toBe(false);
        expect(isValidVanillaRegexFlags('vv')).toBe(false);

        expect(() => assertValidVanillaRegexFlags('gg')).toThrow(RGXInvalidVanillaRegexFlagsError);
        expect(() => assertValidVanillaRegexFlags('gii')).toThrow(RGXInvalidVanillaRegexFlagsError);
        expect(() => assertValidVanillaRegexFlags('mm')).toThrow(RGXInvalidVanillaRegexFlagsError);
        expect(() => assertValidVanillaRegexFlags('ss')).toThrow(RGXInvalidVanillaRegexFlagsError);
        expect(() => assertValidVanillaRegexFlags('uu')).toThrow(RGXInvalidVanillaRegexFlagsError);
        expect(() => assertValidVanillaRegexFlags('yy')).toThrow(RGXInvalidVanillaRegexFlagsError);
        expect(() => assertValidVanillaRegexFlags('dd')).toThrow(RGXInvalidVanillaRegexFlagsError);
        expect(() => assertValidVanillaRegexFlags('vv')).toThrow(RGXInvalidVanillaRegexFlagsError);
    });
});