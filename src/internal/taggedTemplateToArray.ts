import { RGXTokenOrPart } from "src/walker";

export function rgxTaggedTemplateToArray<R = unknown, S = unknown, T = unknown>(
    strings: TemplateStringsArray, tokens: RGXTokenOrPart<R, S, T>[], multiline: boolean, verbatim: boolean
): RGXTokenOrPart<R, S, T>[] {
    function isNullOrUndefined(value: unknown): value is null | undefined {
        return value === null || value === undefined;
    }

    const array: RGXTokenOrPart<R, S, T>[] = [];

    for (let i = 0; i < Math.max(strings.length, tokens.length); i++) {
        const string = strings[i];
        const token = tokens[i];

        // Strings always come before tokens
        if (!isNullOrUndefined(string)) {
            if (!multiline) {
                if (verbatim) array.push(string);
                else array.push({ rgxInterpolate: true, toRgx: () => string });
            } else {
                const startsNewLine = string.startsWith("\n");

                // Remove all empty lines, remove comments, and trim whitespace from the start of each line.
                let lines = string
                    .split("\n")
                    /*
                        This check makes sure
                        `
                            foo |
                            ${'bar'} |
                            baz
                        `

                        resolves to "foo | bar |baz" instead of "foo | bar|baz"
                    */
                    .map((line, i) => (i !== 0 || startsNewLine) ? line.trimStart() : line)
                    // Remove comments both for the start of the line.
                    .filter(line => !line.startsWith("//"))
                    .filter(line => line.length > 0)
                    // Remove comments at the end of the line.
                    .map(line => {
                        const commentIndex = line.indexOf("//");
                        if (commentIndex !== -1) {
                            return line.substring(0, commentIndex).trimEnd();
                        }
                        return line;
                    })
                    .join("")
                ;

                if (verbatim) array.push(lines);
                else array.push({ rgxInterpolate: true, toRgx: () => lines });
            }
        }
        if (!isNullOrUndefined(token)) array.push(token);
    }

    return array;
}