import { RGXClassToken, rgxClassWrapper, RGXConstantToken, rgxRepeat } from "./class";
import { RGXConstantConflictError, RGXInvalidConstantKeyError } from "./errors";
import { rgxConstantRegistry as rgxConstants } from "./internal/constantRegistry";
import { RGXToken } from "./types";

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
        toRgx() { return /^/; }
    },
    "line-start": {
        toRgx() { return /^/m; }
    },
    "end": {
        toRgx() { return /$/; }
    },
    "line-end": {
        toRgx() { return /$/m; }
    },
    "word-bound": {
        toRgx() { return /\b/; }
    },
    "non-word-bound": {
        toRgx() { return /\B/; }
    },
    "word-bound-start": {
        toRgx() {
            // Make sure there is a non-word character before and a word character after
            return /(?<=\W|^)(?=\w)/;
        }
    },
    "word-bound-end": {
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
        toRgx() {
            // Put this before any pattern to ensure that the pattern is escaped, i.e., preceded by an odd number of backslashes.
            return /(?<=(?<!\\)\\(?:\\\\)*)/;
        }
    },

    "non-escape-bound": {
        toRgx() {
            // Put this before any pattern to ensure that the pattern is not escaped, i.e., not preceded by an odd number of backslashes.
            // Essentially equivalent to escape-bound, but without the extra backslash between the negative lookbehind and the non-capturing group.
            return /(?<=(?<!\\)(?:\\\\)*)/;
        }
    },

    "never": {
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

// Whether following the references starting at value leads back to name, so the constant would refer to itself.
function refersToRGXConstant(value: RGXToken, name: RGXConstantName): boolean {
    const seen = new Set<string>();
    while (RGXConstantToken.check(value) && !seen.has(value.name)) {
        if (value.name === name) return true;
        seen.add(value.name);
        if (!hasRGXConstant(value.name)) return false;
        value = rgxConstants[value.name]!;
    }
    return false;
}

export function defineRGXConstant(name: RGXConstantName, value: RGXToken) {
    assertNotHasRGXConstant(name);
    if (refersToRGXConstant(value, name)) {
        throw new RGXConstantConflictError("A constant can't be defined as a reference to itself.", name);
    }
    rgxConstants[name] = RGXClassToken.check(value) ? value : rgxClassWrapper(value);
    return rgxConstants[name];
}

// A reference to the constant, which looks it up whenever it is used, or only the first time with caching on.
export function rgxConstant(name: RGXConstantName, cache: boolean = false): RGXConstantToken {
    assertHasRGXConstant(name);
    return new RGXConstantToken(name, cache);
}

// The token the constant is defined as, rather than a reference to it.
export function rgxConstantValue(name: RGXConstantName): RGXClassToken {
    assertHasRGXConstant(name);
    return rgxConstants[name]!;
}

// Returns the deleted value, so it can be defined again later.
export function deleteRGXConstant(name: RGXConstantName): RGXClassToken {
    const value = rgxConstantValue(name);
    delete rgxConstants[name];
    return value;
}

for (const [name, value] of Object.entries(RGX_PREDEFINED_CONSTANTS)) {
    defineRGXConstant(name, value as RGXToken);
}
