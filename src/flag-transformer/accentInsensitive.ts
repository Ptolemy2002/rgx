import { RegExpFlagTransformer } from "src/ExtRegExp";

const accentPatterns: string[] = [
    "(a|á|à|ä|â|ã)", "(A|Á|À|Ä|Â|Ã)",
    "(e|é|è|ë|ê)"  , "(E|É|È|Ë|Ê)"  ,
    "(i|í|ì|ï|î)"  , "(I|Í|Ì|Ï|Î)"  ,
    "(o|ó|ò|ö|ô|õ)", "(O|Ó|Ò|Ö|Ô|Õ)",
    "(u|ú|ù|ü|û)"  , "(U|Ú|Ù|Ü|Û)"
];

export const accentInsensitiveFlagTransformer: RegExpFlagTransformer = function (exp) {
    let source = exp.source;
    const flags = exp.flags;

    accentPatterns.forEach((pattern) => {
        // Replace any of the characters in the pattern with the pattern itself
        source = source.replaceAll(new RegExp(pattern, "g"), pattern);
    });

    return new RegExp(source, flags);
};