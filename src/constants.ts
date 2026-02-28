import { RGXLookaheadToken, RGXLookbehindToken } from "./class";
import { RGXConstantConflictError, RGXInvalidConstantKeyError } from "./errors";
import { RGXToken } from "./types";

const rgxConstants: Record<string, RGXToken> = {};

export function listRGXConstants(): string[] {
    return Object.keys(rgxConstants);
}

export function hasRGXConstant(name: string): boolean {
    return name in rgxConstants;
}

export function assertHasRGXConstant(name: string) {
    if (!hasRGXConstant(name)) {
        throw new RGXInvalidConstantKeyError("Constant with name not found.", name);
    }
}

export function assertNotHasRGXConstant(name: string) {
    if (hasRGXConstant(name)) {
        throw new RGXConstantConflictError("Constant with name already defined.", name);
    }
}

export function defineRGXConstant(name: string, value: RGXToken) {
    assertNotHasRGXConstant(name);
    rgxConstants[name] = value;
    return value;
}

export function rgxConstant(name: string): RGXToken {
    assertHasRGXConstant(name);
    return rgxConstants[name];
}

export function deleteRGXConstant(name: string) {
    assertHasRGXConstant(name);
    delete rgxConstants[name];
}

// Control Characters
defineRGXConstant("newline", "\n");
defineRGXConstant("carriage-return", "\r");
defineRGXConstant("tab", "\t");
defineRGXConstant("null", "\0");
defineRGXConstant("form-feed", "\f");

// Special Characters
defineRGXConstant("any", {
    rgxGroupWrap: false,
    toRgx() {
        return /./;
    }
});

defineRGXConstant("start", {
    rgxGroupWrap: false,
    toRgx() {
        return /^/;
    }
});

defineRGXConstant("end", {
    rgxGroupWrap: false,
    toRgx() {
        return /$/;
    }
});

defineRGXConstant("word-bound", {
    rgxGroupWrap: false,
    toRgx() {
        return /\b/;
    }
});

defineRGXConstant("non-word-bound", {
    rgxGroupWrap: false,
    toRgx() {
        return /\B/;
    }
});

defineRGXConstant("word-bound-start", {
    rgxGroupWrap: false,
    toRgx() {
        // Make sure there is a non-word character before and a word character after
        return /(?<=\W)(?=\w)/;
    }
});

defineRGXConstant("word-bound-end", {
    rgxGroupWrap: false,
    toRgx() {
        // Make sure there is a word character before and a non-word character after
        return /(?<=\w)(?=\W)/;
    }
});

// Character Sets
defineRGXConstant("letter", {
    rgxIsGroup: true,
    rgxGroupWrap: false,
    toRgx() {
        return /[a-zA-Z]/;
    }
});

defineRGXConstant("lowercase-letter", {
    rgxIsGroup: true,
    rgxGroupWrap: false,
    toRgx() {
        return /[a-z]/;
    }
});

defineRGXConstant("uppercase-letter", {
    rgxIsGroup: true,
    rgxGroupWrap: false,
    toRgx() {
        return /[A-Z]/;
    }
});

defineRGXConstant("non-letter", {
    rgxIsGroup: true,
    rgxGroupWrap: false,
    toRgx() {
        return /[^a-zA-Z]/;
    }
});

defineRGXConstant("alphanumeric", {
    rgxIsGroup: true,
    rgxGroupWrap: false,
    toRgx() {
        return /[a-zA-Z0-9]/;
    }
});

defineRGXConstant("non-alphanumeric", {
    rgxIsGroup: true,
    rgxGroupWrap: false,
    toRgx() {
        return /[^a-zA-Z0-9]/;
    }
});

// Predefined Character Sets
defineRGXConstant("digit", {
    rgxGroupWrap: false,
    toRgx() {
        return /\d/;
    }
});

defineRGXConstant("non-digit", {
    rgxGroupWrap: false,
    toRgx() {
        return /\D/;
    }
});

defineRGXConstant("whitespace", {
    rgxGroupWrap: false,
    toRgx() {
        return /\s/;
    }
});

defineRGXConstant("non-whitespace", {
    rgxGroupWrap: false,
    toRgx() {
        return /\S/;
    }
});

defineRGXConstant("vertical-whitespace", {
    rgxGroupWrap: false,
    toRgx() {
        return /\v/;
    }
});

defineRGXConstant("word-char", {
    rgxGroupWrap: false,
    toRgx() {
        return /\w/;
    }
});

defineRGXConstant("non-word-char", {
    rgxGroupWrap: false,
    toRgx() {
        return /\W/;
    }
});

defineRGXConstant("backspace", {
    rgxIsGroup: true,
    rgxGroupWrap: false,
    toRgx() {
        return /[\b]/;
    }
});
