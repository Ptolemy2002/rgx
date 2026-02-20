export function taggedTemplateToArray<T>(strings: TemplateStringsArray, tokens: T[]): (string | T)[] {
    function isNullOrUndefined(value: unknown): value is null | undefined {
        return value === null || value === undefined;
    }

    const array: (string | T)[] = [];

    for (let i = 0; i < Math.max(strings.length, tokens.length); i++) {
        const string = strings[i];
        const token = tokens[i];

        // Strings always come before tokens
        if (!isNullOrUndefined(string)) array.push(string);
        if (!isNullOrUndefined(token)) array.push(token);
    }

    return array;
}