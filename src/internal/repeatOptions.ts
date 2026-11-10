import type { RGXRepeatOptions } from "src/class/repeat";

// The lazy argument can be an options object instead, in which case the possessive argument is ignored.
export function normalizeRGXRepeatOptions(lazy: boolean | RGXRepeatOptions, possessive: boolean): Required<RGXRepeatOptions> {
    const options = typeof lazy === "object" ? lazy : { lazy, possessive };
    return {
        lazy: options.lazy ?? false,
        possessive: options.possessive ?? false,
        perOption: options.perOption ?? false,
        inner: options.inner ?? false
    };
}
