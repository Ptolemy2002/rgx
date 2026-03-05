export function expectError<
    T extends new (...args: unknown[]) => Error
>(fn: () => void, errorClass: T, errorValidator?: (error: InstanceType<T>) => void) {
    let error: Error | null = null;

    const capturingFn = () => {
        try {
            fn();
        } catch (e) {
            error = e;
            throw e;
        }
    };

    expect(capturingFn).toThrow(errorClass);
    
    if (errorValidator) {
        errorValidator(error as InstanceType<T>);
    }
}