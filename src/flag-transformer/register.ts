import { registerFlagTransformer, unregisterFlagTransformer } from "src/ExtRegExp";
import { accentInsensitiveFlagTransformer } from "./accentInsensitive";
import { wholeFlagTransformer } from "./whole";
import { beginningFlagTransformer } from "./start";
import { endFlagTransformer } from "./end";

export function registerCustomFlagTransformers() {
    registerFlagTransformer("a", accentInsensitiveFlagTransformer);
    registerFlagTransformer("w", wholeFlagTransformer);
    registerFlagTransformer("b", beginningFlagTransformer);
    registerFlagTransformer("e", endFlagTransformer);
}

export function unregisterCustomFlagTransformers() {
    unregisterFlagTransformer("a");
    unregisterFlagTransformer("w");
    unregisterFlagTransformer("b");
    unregisterFlagTransformer("e");
}