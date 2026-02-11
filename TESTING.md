# Testing Guide

This library uses [Jest](https://jestjs.io/) with [ts-jest](https://kulshekhar.github.io/ts-jest/) for testing TypeScript code.

## Installation

First, install the testing dependencies:

```bash
npm install
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests can be organized in two ways:

### 1. Dedicated test directory

Place test files in the `/test` directory:

```
test/
  index.test.ts
  setup.ts
```

### 2. Co-located with source files

Place test files in `__tests__` directories alongside your source code:

```
src/
  __tests__/
    example.test.ts
  index.ts
```

Both approaches are supported and can be used together.

## Writing Tests

### Basic Test Example

```typescript
import { sayHello } from '../src/index';

describe('sayHello', () => {
  it('should log hello message', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    sayHello();

    expect(consoleSpy).toHaveBeenCalledWith('Hello from lib');
    consoleSpy.mockRestore();
  });
});
```

### Test File Naming

Jest will automatically discover files that match these patterns:
- `**/__tests__/**/*.ts`
- `**/*.test.ts`
- `**/*.spec.ts`

## Configuration

The Jest configuration is in `jest.config.js`. Key settings:

- **testEnvironment**: `node` (for Node.js libraries)
- **roots**: Source and test directories to search
- **collectCoverageFrom**: Files to include in coverage reports
- **moduleNameMapper**: Path alias support (matches tsconfig paths)

## Coverage Reports

After running `npm run test:coverage`, coverage reports are available in:
- Terminal: Summary output
- `coverage/lcov-report/index.html`: Detailed HTML report
- `coverage/lcov.info`: LCOV format for CI/CD tools

## Best Practices

1. **One test file per source file**: Keep tests organized and easy to find
2. **Descriptive test names**: Use clear, behavior-focused descriptions
3. **Arrange-Act-Assert**: Structure tests with setup, execution, and verification
4. **Mock external dependencies**: Isolate units under test
5. **Test edge cases**: Include happy path, error cases, and boundary conditions
6. **Keep tests fast**: Avoid unnecessary async operations or timeouts
7. **Clean up resources**: Restore mocks and clear timers after tests

## Common Patterns

### Mocking console output

```typescript
const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
// ... test code ...
consoleSpy.mockRestore();
```

### Testing async functions

```typescript
it('should resolve with data', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected value');
});
```

### Testing errors

```typescript
it('should throw an error', () => {
  expect(() => {
    functionThatThrows();
  }).toThrow('Expected error message');
});
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
- [Jest Matchers](https://jestjs.io/docs/expect)
