type AccentData = {
    // The precomposed accented variants of each Latin letter: every code point whose canonical decomposition (NFD)
    // is the letter followed by combining marks.
    variants: Map<string, string[]>;
    // The letter each accentable code point (a letter with variants, or one of the variants) belongs to.
    bases: Map<number, string>;
    // The keys of bases, in ascending order.
    codePoints: number[];
};

let accentData: AccentData | null = null;

// Built on first use, since it means checking every code point in the BMP. No code point outside the BMP decomposes
// this way.
function getAccentData(): AccentData {
    if (accentData !== null) return accentData;

    const variants = new Map<string, string[]>();
    const bases = new Map<number, string>();
    for (let codePoint = 0x80; codePoint <= 0xFFFF; codePoint++) {
        // Lone surrogates have no decomposition.
        if (codePoint >= 0xD800 && codePoint <= 0xDFFF) continue;

        const decomposed = String.fromCodePoint(codePoint).normalize("NFD");
        if (!/^[A-Za-z]\p{M}+$/u.test(decomposed)) continue;

        const letter = decomposed[0]!;
        if (!variants.has(letter)) variants.set(letter, []);
        variants.get(letter)!.push(String.fromCodePoint(codePoint));
        bases.set(codePoint, letter);
    }

    for (const letter of variants.keys()) bases.set(letter.codePointAt(0)!, letter);

    accentData = { variants, bases, codePoints: [...bases.keys()].sort((a, b) => a - b) };
    return accentData;
}

// The letter whose accented forms include the code point, or null if it has none.
export function accentBaseOf(codePoint: number): string | null {
    return getAccentData().bases.get(codePoint) ?? null;
}

// Every code point that accentBaseOf returns a letter for, in ascending order.
export function accentableCodePoints(): readonly number[] {
    return getAccentData().codePoints;
}

// A character class matching the letter and its precomposed variants. They are all letters, so the class reads the
// same with any flags.
export function accentVariantClass(letter: string): string {
    return `[${letter}${getAccentData().variants.get(letter)!.join("")}]`;
}
