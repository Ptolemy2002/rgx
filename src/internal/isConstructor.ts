// This should work for our purposes
const handler = { construct() { return handler; } };
export function isConstructor(value: unknown): value is new (...args: unknown[]) => unknown {
    try {
        //@ts-expect-error If the value isn't constructable, the error will be caught.
        return !!(new (new Proxy(value, handler))())
    } catch {
        return false;
    }
}