import { visitRegExpAST } from "@eslint-community/regexpp";
import { RegExpFlagTransformer } from "src/ExtRegExp";
import { parseRegexSource, scanOptionsFromFlags } from "src/internal";

// Each base character, followed by its accented variants.
const accentGroups: string[] = [
    "aáàäâã", "AÁÀÄÂÃ",
    "eéèëê" , "EÉÈËÊ" ,
    "iíìïî" , "IÍÌÏÎ" ,
    "oóòöôõ", "OÓÒÖÔÕ",
    "uúùüû" , "UÚÙÜÛ"
];

// Every character in a group is replaced with a character class matching the whole group. None of these characters
// are special inside a class, and they are all single UTF-16 code units, so the class reads the same with any flags.
const accentClasses = new Map<string, string>(
    accentGroups.flatMap(group => [...group].map(character => [character, `[${group}]`] as const))
);

export const accentInsensitiveFlagTransformer: RegExpFlagTransformer = function (exp) {
    const source = exp.source;
    const flags = exp.flags;

    const ast = parseRegexSource(source, scanOptionsFromFlags(flags));
    // Flag transformers are only given valid regexes, so this only happens if the engine accepts syntax that is newer
    // than the parser. There is none at the moment, so this can't be tested.
    /* istanbul ignore if */
    if (ast === null) return [source, flags];

    const replacements: { start: number; end: number; replacement: string }[] = [];
    visitRegExpAST(ast, {
        onCharacterEnter(node) {
            // Characters in character classes (including ranges and class strings) are left alone, since a class
            // can't be placed inside them.
            if (node.parent.type !== "Alternative" && node.parent.type !== "Quantifier") return;
            // Only characters written as themselves are replaced, not escapes that produce them (such as "é").
            if (node.raw !== String.fromCodePoint(node.value)) return;

            const replacement = accentClasses.get(node.raw);
            if (replacement !== undefined) replacements.push({ start: node.start, end: node.end, replacement });
        }
    });

    // Replacing from the end keeps the positions of the earlier characters valid.
    let result = source;
    for (const { start, end, replacement } of replacements.sort((a, b) => b.start - a.start)) {
        result = result.slice(0, start) + replacement + result.slice(end);
    }

    return [result, flags];
};
