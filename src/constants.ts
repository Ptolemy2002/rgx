import { rgxClassWrapper } from "./class";
import { RGXConstantConflictError, RGXInvalidConstantKeyError } from "./errors";
import { isRGXNativeToken } from "./typeGuards";
import { RGXToken } from "./types";

const rgxConstants: Record<string, RGXToken> = {};

export const RGX_PREDEFINED_CONSTANTS = {
    // Control Characters
    "newline": "\n",
    "carriage-return": "\r",
    "tab": "\t",
    "null": "\0",
    "form-feed": "\f",

    // Special Characters
    "any": {
        rgxGroupWrap: false,
        toRgx() { return /./s; }
    },
    "non-newline": {
        rgxGroupWrap: false,
        toRgx() { return /./; }
    },
    "start": {
        rgxGroupWrap: false,
        rgxIsRepeatable: false,
        toRgx() { return /^/; }
    },
    "line-start": {
        rgxGroupWrap: false,
        rgxIsRepeatable: false,
        toRgx() { return /^/m; }
    },
    "end": {
        rgxGroupWrap: false,
        rgxIsRepeatable: false,
        toRgx() { return /$/; }
    },
    "line-end": {
        rgxGroupWrap: false,
        rgxIsRepeatable: false,
        toRgx() { return /$/m; }
    },
    "word-bound": {
        rgxGroupWrap: false,
        rgxIsRepeatable: false,
        toRgx() { return /\b/; }
    },
    "non-word-bound": {
        rgxGroupWrap: false,
        rgxIsRepeatable: false,
        toRgx() { return /\B/; }
    },
    "word-bound-start": {
        rgxGroupWrap: false,
        rgxIsRepeatable: false,
        toRgx() {
            // Make sure there is a non-word character before and a word character after
            return /(?<=\W)(?=\w)/;
        }
    },
    "word-bound-end": {
        rgxGroupWrap: false,
        rgxIsRepeatable: false,
        toRgx() {
            // Make sure there is a word character before and a non-word character after
            return /(?<=\w)(?=\W)/;
        }
    },

    // Character Sets
    "letter": {
        rgxIsGroup: true,
        rgxGroupWrap: false,
        toRgx() { return /[a-zA-Z]/; }
    },
    "lowercase-letter": {
        rgxIsGroup: true,
        rgxGroupWrap: false,
        toRgx() { return /[a-z]/; }
    },
    "uppercase-letter": {
        rgxIsGroup: true,
        rgxGroupWrap: false,
        toRgx() { return /[A-Z]/; }
    },
    "non-letter": {
        rgxIsGroup: true,
        rgxGroupWrap: false,
        toRgx() { return /[^a-zA-Z]/; }
    },
    "alphanumeric": {
        rgxIsGroup: true,
        rgxGroupWrap: false,
        toRgx() { return /[a-zA-Z0-9]/; }
    },
    "non-alphanumeric": {
        rgxIsGroup: true,
        rgxGroupWrap: false,
        toRgx() { return /[^a-zA-Z0-9]/; }
    },

    // Predefined Character Sets
    "digit": {
        rgxGroupWrap: false,
        toRgx() { return /\d/; }
    },
    "non-digit": {
        rgxGroupWrap: false,
        toRgx() { return /\D/; }
    },
    "whitespace": {
        rgxGroupWrap: false,
        toRgx() { return /\s/; }
    },
    "whitespace-block": {
        rgxGroupWrap: false,
        toRgx() { return /\s+/; }
    },
    "non-whitespace": {
        rgxGroupWrap: false,
        toRgx() { return /\S/; }
    },
    "vertical-whitespace": {
        rgxGroupWrap: false,
        toRgx() { return /\v/; }
    },
    "word-char": {
        rgxGroupWrap: false,
        toRgx() { return /\w/; }
    },
    "non-word-char": {
        rgxGroupWrap: false,
        toRgx() { return /\W/; }
    },
    "backspace": {
        rgxIsGroup: true,
        rgxGroupWrap: false,
        toRgx() { return /[\b]/; }
    },

    // Complex Constructs
    "escape-bound": {
        rgxGroupWrap: false,
        rgxIsRepeatable: false,
        toRgx() {
            // Put this before any pattern to ensure that the pattern is escaped, i.e., preceded by an odd number of backslashes.
            return /(?<=(?<!\\)\\(?:\\\\)*)/;
        }
    },

    "non-escape-bound": {
        rgxGroupWrap: false,
        rgxIsRepeatable: false,
        toRgx() {
            // Put this before any pattern to ensure that the pattern is not escaped, i.e., not preceded by an odd number of backslashes.
            // Essentially equivalent to escape-bound, but without the extra backslash between the negative lookbehind and the non-capturing group.
            return /(?<=(?<!\\)(?:\\\\)*)/;
        }
    },
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
    // Not strings themselves so that they aren't removed in multiline mode.
    rgxConstants[name] = isRGXNativeToken(value) ? rgxClassWrapper(value) : value;
    return rgxConstants[name];
}

export function rgxConstant(name: RGXConstantName): RGXToken {
    assertHasRGXConstant(name);
    return rgxConstants[name];
}

export function deleteRGXConstant(name: RGXConstantName) {
    assertHasRGXConstant(name);
    delete rgxConstants[name];
}

for (const [name, value] of Object.entries(RGX_PREDEFINED_CONSTANTS)) {
    defineRGXConstant(name, value as RGXToken);
}
