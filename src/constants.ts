import { RGXClassToken, rgxClassWrapper, rgxRepeat } from "./class";
import { RGXConstantConflictError, RGXInvalidConstantKeyError } from "./errors";
import { RGXToken } from "./types";

const rgxConstants: Record<string, RGXClassToken> = {};

export const RGX_PREDEFINED_CONSTANTS = {
    // Control Characters
    "newline": "\n",
    "carriage-return": "\r",
    "tab": "\t",
    "null": "\0",
    "form-feed": "\f",

    // Special Characters
    "any": {
        toRgx() { return /./s; }
    },
    "non-newline": {
        toRgx() { return /./; }
    },
    "start": {
        rgxIsRepeatable: false,
        toRgx() { return /^/; }
    },
    "line-start": {
        rgxIsRepeatable: false,
        toRgx() { return /^/m; }
    },
    "end": {
        rgxIsRepeatable: false,
        toRgx() { return /$/; }
    },
    "line-end": {
        rgxIsRepeatable: false,
        toRgx() { return /$/m; }
    },
    "word-bound": {
        rgxIsRepeatable: false,
        toRgx() { return /\b/; }
    },
    "non-word-bound": {
        rgxIsRepeatable: false,
        toRgx() { return /\B/; }
    },
    "word-bound-start": {
        rgxIsRepeatable: false,
        toRgx() {
            // Make sure there is a non-word character before and a word character after
            return /(?<=\W|^)(?=\w)/;
        }
    },
    "word-bound-end": {
        rgxIsRepeatable: false,
        toRgx() {
            // Make sure there is a word character before and a non-word character after
            return /(?<=\w)(?=\W|$)/;
        }
    },

    // Character Sets
    "letter": {
        toRgx() { return /[a-zA-Z]/; }
    },
    "lowercase-letter": {
        toRgx() { return /[a-z]/; }
    },
    "uppercase-letter": {
        toRgx() { return /[A-Z]/; }
    },
    "non-letter": {
        toRgx() { return /[^a-zA-Z]/; }
    },
    "alphanumeric": {
        toRgx() { return /[a-zA-Z0-9]/; }
    },
    "non-alphanumeric": {
        toRgx() { return /[^a-zA-Z0-9]/; }
    },

    // Predefined Character Sets
    "digit": {
        toRgx() { return /\d/; }
    },
    "non-digit": {
        toRgx() { return /\D/; }
    },
    "whitespace": {
        toRgx() { return /\s/; }
    },
    "whitespace-block": rgxRepeat({
        toRgx() { return /\s/; }
    }, 1, null),
    "non-whitespace": {
        toRgx() { return /\S/; }
    },
    "non-newline-whitespace": {
        toRgx() { return /[^\n\S]/; }
    },
    "non-newline-whitespace-block": rgxRepeat({
        toRgx() { return /[^\n\S]/; }
    }, 1, null),
    "vertical-whitespace": {
        toRgx() { return /\v/; }
    },
    "word-char": {
        toRgx() { return /\w/; }
    },
    "non-word-char": {
        toRgx() { return /\W/; }
    },
    "backspace": {
        toRgx() { return /[\b]/; }
    },

    // Complex Constructs
    "escape-bound": {
        rgxIsRepeatable: false,
        toRgx() {
            // Put this before any pattern to ensure that the pattern is escaped, i.e., preceded by an odd number of backslashes.
            return /(?<=(?<!\\)\\(?:\\\\)*)/;
        }
    },

    "non-escape-bound": {
        rgxIsRepeatable: false,
        toRgx() {
            // Put this before any pattern to ensure that the pattern is not escaped, i.e., not preceded by an odd number of backslashes.
            // Essentially equivalent to escape-bound, but without the extra backslash between the negative lookbehind and the non-capturing group.
            return /(?<=(?<!\\)(?:\\\\)*)/;
        }
    },

    "never": {
        rgxIsRepeatable: false,
        toRgx() {
            // Never succeed
            return /(?!)/
        }
    }
} as const satisfies Record<string, RGXToken>;

export type RGXPredefinedConstant = keyof typeof RGX_PREDEFINED_CONSTANTS;
export type RGXConstantName = RGXPredefinedConstant | (string & {});

export function listRGXConstants(): string[] {
    return Object.keys(rgxConstants);
}

export function hasRGXConstant(name: RGXConstantName): boolean {
    return name in rgxConstants;
}

export function assertHasRGXConstant(name: RGXConstantName) {
    if (!hasRGXConstant(name)) {
        throw new RGXInvalidConstantKeyError("Constant with name not found.", name);
    }
}

export function assertNotHasRGXConstant(name: RGXConstantName) {
    if (hasRGXConstant(name)) {
        throw new RGXConstantConflictError("Constant with name already defined.", name);
    }
}

export function defineRGXConstant(name: RGXConstantName, value: RGXToken) {
    assertNotHasRGXConstant(name);
    rgxConstants[name] = RGXClassToken.check(value) ? value : rgxClassWrapper(value);
    return rgxConstants[name];
}

export function rgxConstant(name: RGXConstantName): RGXClassToken {
    assertHasRGXConstant(name);
    return rgxConstants[name]!;
}

export function deleteRGXConstant(name: RGXConstantName) {
    assertHasRGXConstant(name);
    delete rgxConstants[name];
}

for (const [name, value] of Object.entries(RGX_PREDEFINED_CONSTANTS)) {
    defineRGXConstant(name, value as RGXToken);
}
