import { RGXError, RGXInvalidTokenError } from "src/errors";

export function createClassGuardFunction<T extends new (...args: unknown[]) => unknown>(constructor: T) {
    return (value: unknown): value is InstanceType<T> => value instanceof constructor;
}

export function createAssertClassGuardFunction<T extends new (...args: unknown[]) => unknown>(
    constructor: T,
    constructError: (value: unknown, constructor: T) => RGXError =
        (value, constructor) =>
            new RGXInvalidTokenError(
                "Invalid token type", { type: "custom", values: [`instance of ${constructor.name}`] },
                value
            )
) {
    return (value: unknown): asserts value is InstanceType<T> => {
        if (!(value instanceof constructor)) {
            throw constructError(value, constructor);
        }
    };
}