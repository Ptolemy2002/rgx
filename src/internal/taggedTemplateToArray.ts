export function taggedTemplateToArray<T>(strings: TemplateStringsArray, tokens: T[], multiline: boolean): (string | T)[] {
    function isNullOrUndefined(value: unknown): value is null | undefined {
        return value === null || value === undefined;
    }

    const array: (string | T)[] = [];

    for (let i = 0; i < Math.max(strings.length, tokens.length); i++) {
        const string = strings[i];
        const token = tokens[i];

        // Strings always come before tokens
        if (!isNullOrUndefined(string)) {
            if (!multiline) {
                array.push(string);
            } else {
                // Remove all empty lines and trim whitespace from the start of each line.
                let lines = string.split("\n").map(line => line.trimStart()).filter(line => line.length > 0).join("");
                array.push(lines);
            }
        }
        if (!isNullOrUndefined(token)) array.push(token);
    }

    return array;
}