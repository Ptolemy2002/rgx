import { getProxy } from "./getProxy";

// This should work for our purposes
const handler = { construct() { return handler; } };
let gaveWarning = false;

export function isConstructor(value: unknown): value is new (...args: unknown[]) => unknown {
    try {
        if (typeof getProxy() === "undefined") {
            if (!gaveWarning) console.log("rgx: Proxy is not supported. Constructor detection will not work properly.");
            gaveWarning = true;
            return false;
        }

        //@ts-expect-error If the value isn't constructable, the error will be caught.
        return !!(new (new Proxy(value, handler))())
    } catch {
        return false;
    }
}