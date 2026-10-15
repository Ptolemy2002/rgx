export type ScanRegexSourceOptions = {
    // Whether the source will be compiled with the u or v flag, which changes how some escapes are read.
    unicode?: boolean;
    // Whether the source will be compiled with the v flag, which lets character classes nest.
    unicodeSets?: boolean;
};

export function scanOptionsFromFlags(flags: string): ScanRegexSourceOptions {
    return { unicode: flags.includes('u') || flags.includes('v'), unicodeSets: flags.includes('v') };
}

export type RegexSourceScan = {
    // How many groups are still open at the end of the source.
    depth: number;
    // Whether a ')' appeared with no open group to close.
    unmatchedClose: boolean;
};

// Counts the groups opened and closed in a regex source, skipping escapes and character classes. Unlike the rest of
// the analysis (see analyzeRegexSource.ts), this works on sources that are not valid regexes, such as interpolations
// with unterminated groups. Escapes only need their next character skipped, since no multi-character escape contains
// a parenthesis, bracket, or backslash.
export function scanRegexSource(source: string, { unicodeSets = false }: ScanRegexSourceOptions = {}): RegexSourceScan {
    let depth = 0;
    let unmatchedClose = false;
    let charClassDepth = 0;

    for (let i = 0; i < source.length; i++) {
        const ch = source[i];

        if (ch === '\\') i++;
        else if (charClassDepth > 0) {
            // Character classes only nest with the v flag. Without it, '[' inside a class is a literal.
            if (ch === '[' && unicodeSets) charClassDepth++;
            else if (ch === ']') charClassDepth--;
        }
        else if (ch === '[') charClassDepth++;
        else if (ch === '(') depth++;
        else if (ch === ')') {
            if (depth > 0) depth--;
            else unmatchedClose = true;
        }
    }

    return { depth, unmatchedClose };
}

export function hasRegexParenErrors(source: string, options: ScanRegexSourceOptions = {}): boolean {
    const { depth, unmatchedClose } = scanRegexSource(source, options);
    return unmatchedClose || depth !== 0;
}
