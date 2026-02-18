export type ConstructFunction<T> = T extends (new (...args: infer A) => infer R) ? ((...args: A) => R) : never;

export function createConstructFunction<T extends new (...args: unknown[]) => unknown>(constructor: T) {
    return ((...args: unknown[]) => new constructor(...args)) as ConstructFunction<T>;
}
