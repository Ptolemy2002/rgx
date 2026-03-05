# createRGXClassGuardFunction
```typescript
function createRGXClassGuardFunction<T extends new (...args: unknown[]) => unknown>(constructor: T): (value: unknown) => value is InstanceType<T>
```
Creates a type guard function that checks whether a value is an instance of the given constructor. Used internally by almost every RGX class to define its `check` static property.

## Parameters
  - `constructor` (`T`): The constructor whose instances the guard should accept.

## Returns
- `(value: unknown) => value is InstanceType<T>`: A function that returns `true` if `value` is an instance of `constructor`, otherwise `false`.

# createAssertRGXClassGuardFunction
```typescript
function createAssertRGXClassGuardFunction<T extends new (...args: unknown[]) => unknown>(
    constructor: T,
    constructError?: (value: unknown, constructor: T) => RGXError
): (value: unknown) => asserts value is InstanceType<T>
```
Creates an assertion function that asserts a value is an instance of the given constructor, throwing an `RGXError` if not. Used internally by almost every RGX class to define its `assert` static property.

## Parameters
  - `constructor` (`T`): The constructor whose instances the assertion should accept.
  - `constructError` (`(value: unknown, constructor: T) => RGXError`, optional): A factory that constructs the error thrown when the assertion fails. Defaults to a function that throws an `RGXInvalidTokenError` with message `"Invalid token type"` and expected value `instance of <constructor.name>`.

## Returns
- `(value: unknown) => asserts value is InstanceType<T>`: A function that asserts `value` is an instance of `constructor`. If `value` is not an instance, the error produced by `constructError` is thrown.
