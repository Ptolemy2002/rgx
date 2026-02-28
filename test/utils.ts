export function expectError<
    T extends new (...args: unknown[]) => Error
>(fn: () => void, errorClass: T, errorValidator?: (error: InstanceType<T>) => boolean) {
    let didError = false;

    try {
        fn();
    } catch (error) {
        didError = true;
        expect(error).toBeInstanceOf(errorClass);
        
        if (errorValidator) {
            expect(errorValidator(error as InstanceType<T>)).toBe(true);
        }
    }

    expect(didError).toBe(true);
}