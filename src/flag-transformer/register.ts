import { registerFlagTransformer, unregisterFlagTransformer } from "src/ExtRegExp";
import { accentInsensitiveFlagTransformer } from "./accentInsensitive";

export function registerCustomFlagTransformers() {
    registerFlagTransformer("a", accentInsensitiveFlagTransformer);
}

export function unregisterCustomFlagTransformers() {
    unregisterFlagTransformer("a");
}