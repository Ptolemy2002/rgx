# Type Reference
The following is a reference to types relevant to the components listed in this file. The full type reference for the library can be found in [type-reference.md](./type-reference.md).

```typescript
type RGXNoOpToken = null | undefined;
type RGXLiteralToken = RegExp;
type RGXNativeToken = string | number | boolean | RGXNoOpToken;
type RGXConvertibleToken = {
    toRgx: () => RGXToken,
    rgxAcceptInsertion?: (tokens: RGXToken[], flags: ValidRegexFlags) => string | boolean,
    readonly rgxGroupWrap?: boolean,
    readonly rgxIsGroup?: boolean,
    readonly rgxIsRepeatable?: boolean,
    readonly rgxInterpolate?: boolean
};
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXToken[];

// See src/constants.ts for the actual mapping of predefined constant names to their token values
type RGXPredefinedConstant = keyof typeof RGX_PREDEFINED_CONSTANTS;
type RGXConstantName = RGXPredefinedConstant | (string & {});
```

# Constants
The library contains utilities for defining `RGXToken` constants, along with providing constants that are registered as soon as the module file is loaded (and thus when the main entry point is imported).

## Variables
### RGX_PREDEFINED_CONSTANTS
```typescript
const RGX_PREDEFINED_CONSTANTS: Record<RGXPredefinedConstant, RGXToken>;
```

A read-only object containing all of the library's built-in constant definitions, keyed by their `RGXPredefinedConstant` name. This is the source from which the predefined constants are registered at module load time. It can be used to inspect available constant names at compile time (via `keyof typeof RGX_PREDEFINED_CONSTANTS`) or to iterate over the predefined set without calling `listRGXConstants`.

## Built-in Constants
The library defines the following built-in constants. Each can be retrieved via `rgxConstant(name)`.

### Control Characters
Since these are defined as native tokens (strings), they are automatically wrapped in `RGXClassWrapperToken` by `defineRGXConstant`, ensuring they are preserved in multiline mode.

| Name | Resolves To | Description |
| --- | --- | --- |
| `"newline"` | `\n` | Newline character |
| `"carriage-return"` | `\r` | Carriage return character |
| `"tab"` | `\t` | Tab character |
| `"null"` | `\0` | Null character |
| `"form-feed"` | `\f` | Form feed character |

### Special Characters
| Name | Resolves To | Description |
| --- | --- | --- |
| `"any"` | `(?s:.)` | Matches any single character, including newlines |
| `"non-newline"` | `.` | Matches any single character except newlines |
| `"start"` | `^` | Start of string anchor |
| `"line-start"` | `^` (with `m` flag) | Start of line anchor |
| `"end"` | `$` | End of string anchor |
| `"line-end"` | `$` (with `m` flag) | End of line anchor |
| `"word-bound"` | `\b` | Word boundary |
| `"non-word-bound"` | `\B` | Non-word boundary |
| `"word-bound-start"` | `(?<=\W)(?=\w)` | Start of a word |
| `"word-bound-end"` | `(?<=\w)(?=\W)` | End of a word |

### Character Sets
| Name | Resolves To | Description |
| --- | --- | --- |
| `"letter"` | `[a-zA-Z]` | Any letter (uppercase or lowercase) |
| `"lowercase-letter"` | `[a-z]` | Any lowercase letter |
| `"uppercase-letter"` | `[A-Z]` | Any uppercase letter |
| `"non-letter"` | `[^a-zA-Z]` | Any character that is not a letter |
| `"alphanumeric"` | `[a-zA-Z0-9]` | Any letter or digit |
| `"non-alphanumeric"` | `[^a-zA-Z0-9]` | Any character that is not a letter or digit |

### Predefined Character Sets
| Name | Resolves To | Description |
| --- | --- | --- |
| `"digit"` | `\d` | Any digit |
| `"non-digit"` | `\D` | Any non-digit |
| `"whitespace"` | `\s` | Any whitespace character |
| `"whitespace-block"` | `\s+` | One or more consecutive whitespace characters |
| `"non-whitespace"` | `\S` | Any non-whitespace character |
| `"vertical-whitespace"` | `\v` | Vertical whitespace character |
| `"word-char"` | `\w` | Any word character (letter, digit, or underscore) |
| `"non-word-char"` | `\W` | Any non-word character |
| `"backspace"` | `[\b]` | Backspace character |

### Complex Constructs
| Name | Resolves To | Description |
| --- | --- | --- |
| `"non-escape-bound"` | `(?<=(?<!\\)(?:\\\\)*)(?=[^\\]\|$)` | Matches a position that is not preceded by an odd number of backslashes, i.e., the next character is not escaped. Note that this doesn't match when the next character is a backslash, since allowing it to do that would cause non-escaped backslashes within a series of backslashes to be treated as escaped. For example, in the string `\\\a`, the first and third backslashes would be treated as escaped. |

## Functions
### listRGXConstants
```typescript
function listRGXConstants(): string[]
```
Returns the names of all currently defined RGX constants.

### hasRGXConstant
```typescript
function hasRGXConstant(name: RGXConstantName): boolean
```
Checks if an RGX constant with the given name exists.

### assertHasRGXConstant
```typescript
function assertHasRGXConstant(name: RGXConstantName): void
```
Asserts that an RGX constant with the given name exists. If the assertion fails, an `RGXInvalidConstantKeyError` will be thrown.

### assertNotHasRGXConstant
```typescript
function assertNotHasRGXConstant(name: RGXConstantName): void
```

Asserts that an RGX constant with the given name does not exist. If the assertion fails, an `RGXConstantConflictError` will be thrown.


### defineRGXConstant
```typescript
function defineRGXConstant(name: RGXConstantName, value: RGXToken): RGXToken
```

Defines a new RGX constant with the given name and value. If the value is a native token (string, number, boolean, or no-op), it is automatically wrapped in an `RGXClassWrapperToken` before being stored. This ensures that native-valued constants are not stripped by multiline template processing in `rgx`, since only the literal string parts of the template are affected by multiline mode. Throws an `RGXConstantConflictError` if a constant with the same name already exists.
- `name` (`RGXConstantName`): The name for the constant.
- `value` (`RGXToken`): The token value to associate with the name. Native tokens are automatically wrapped in `RGXClassWrapperToken`.

**Returns:** `RGXToken` - The stored value (after wrapping, if applicable).

### rgxConstant
```typescript
function rgxConstant(name: RGXConstantName): RGXToken
```

Retrieves the value of an RGX constant by name. Throws an `RGXInvalidConstantKeyError` if no constant with the given name exists.

### deleteRGXConstant
```typescript
function deleteRGXConstant(name: RGXConstantName): void
```

Deletes an existing RGX constant by name. Throws an `RGXInvalidConstantKeyError` if no constant with the given name exists.