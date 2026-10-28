# Type Reference
The following is a reference to types relevant to the components listed in this file. The full type reference for the library can be found in [type-reference.md](./type-reference.md).

```typescript
type RGXNoOpToken = null | undefined;
type RGXLiteralToken = RegExp;
type RGXNativeToken = string | number | boolean | RGXNoOpToken;
type RGXInsertionContext = {
    readonly flags: ValidRegexFlags;              // effective at this position, including enclosing modifier groups
    readonly siblings: readonly RGXToken[];       // the tokens at the same level, including this one
    readonly index: number;                       // this token's position in siblings
    readonly parent: RGXInsertionContext | null;  // the enclosing level, or null at the top level
    readonly container: RGXToken | null;          // the token whose contents this level is, or null at the top level
};
type RGXConvertibleToken = {
    toRgx: (currentFlags?: string) => RGXToken,   // currentFlags: the flags in effect where the token is placed
    rgxAcceptInsertion?: (context: RGXInsertionContext) => string | boolean,
    readonly rgxIsRepeatable?: boolean
};
type RGXInterpolationToken = { readonly rgxInterpolation: string };
type RGXJSONPrimitive = string | number | boolean | null;
type RGXJSONObject = { [key: string]: RGXJSONValue | undefined };
type RGXJSONValue = RGXJSONPrimitive | RGXJSONValue[] | RGXJSONObject;
type RGXJSONNativeToken = Exclude<RGXNativeToken, undefined>;
type RGXJSONLiteralToken = { $rgx: true, source: string, flags?: string, patternTransformers?: string[] };
type RGXJSONClassToken = { $rgx: true, class: string, args?: RGXJSONValue[] };
type RGXJSONInterpolationToken = { $rgx: true, interpolation: string };
type RGXJSONObjectToken = RGXJSONLiteralToken | RGXJSONClassToken | RGXJSONInterpolationToken;
type RGXJSONToken = RGXJSONNativeToken | RGXJSONObjectToken | RGXJSONToken[];
type RGXToken = RGXNativeToken | RGXLiteralToken | RGXConvertibleToken | RGXInterpolationToken | RGXJSONObjectToken | RGXToken[];

// See src/constants.ts for the actual mapping of predefined constant names to their token values
type RGXPredefinedConstant = keyof typeof RGX_PREDEFINED_CONSTANTS;
type RGXConstantName = RGXPredefinedConstant | (string & {});
```

# Constants
The library contains utilities for defining `RGXToken` constants, along with providing constants that are registered as soon as the module file is loaded (and thus when the main entry point is imported).

`rgxConstant(name)` returns a reference to a constant (an `RGXConstantToken`, see [constant.md](./class/token/constant.md)) rather than the constant's token itself. The reference stores only the name, so it keeps pointing at the constant through JSON serialization, and changes made to it never affect the constant. Use `rgxConstantValue(name)` to get the token the constant is defined as.

## Variables
### RGX_PREDEFINED_CONSTANTS
```typescript
const RGX_PREDEFINED_CONSTANTS: Record<RGXPredefinedConstant, RGXToken>;
```

A read-only object containing all of the library's built-in constant definitions, keyed by their `RGXPredefinedConstant` name. This is the source from which the predefined constants are registered at module load time. It can be used to inspect available constant names at compile time (via `keyof typeof RGX_PREDEFINED_CONSTANTS`) or to iterate over the predefined set without calling `listRGXConstants`.

## Built-in Constants
The library defines the following built-in constants. Each can be referenced with `rgxConstant(name)`.

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
| `"word-bound-start"` | `(?<=\W\|^)(?=\w)` | Start of a word |
| `"word-bound-end"` | `(?<=\w)(?=\W\|$)` | End of a word |

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
| `"non-newline-whitespace"` | `[^\n\S]` | Any whitespace character that is not a newline |
| `"non-newline-whitespace-block"` | `[^\n\S]+` | One or more consecutive whitespace characters that are not newlines |
| `"vertical-whitespace"` | `\v` | Vertical whitespace character |
| `"word-char"` | `\w` | Any word character (letter, digit, or underscore) |
| `"non-word-char"` | `\W` | Any non-word character |
| `"backspace"` | `[\b]` | Backspace character |

### Complex Constructs
| Name | Resolves To | Description |
| --- | --- | --- |
| `"escape-bound"` | `(?<=(?<!\\)\\(?:\\\\)*)` | Matches a position that is preceded by an odd number of backslashes, i.e., the next character is escaped. |
| `"non-escape-bound"` | `(?<=(?<!\\)(?:\\\\)*)` | Matches a position that is not preceded by an odd number of backslashes, i.e., the next character is not escaped. |
| `"never"` | `(?!)` | A pattern that always fails to match. Useful as a placeholder sometimes. |

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
function defineRGXConstant(name: RGXConstantName, value: RGXToken): RGXClassToken
```

Defines a new RGX constant with the given name and value. If the value is not already an `RGXClassToken` (checked via `RGXClassToken.check()`), it is automatically wrapped in an `RGXClassWrapperToken` before being stored. This ensures that all stored constants expose the full class token API. Throws an `RGXConstantConflictError` if a constant with the same name already exists, or if the value is a reference that leads back to the constant being defined, directly or through other constants defined as references (such as defining `"a"` as `rgxConstant("b")` while `"b"` is defined as `rgxConstant("a")`). Only references at the top of the value are followed, so a constant that refers to itself from inside another token, such as a group, isn't caught here, and overflows the stack when resolved.
- `name` (`RGXConstantName`): The name for the constant.
- `value` (`RGXToken`): The token value to associate with the name. Values that are not already `RGXClassToken` instances are automatically wrapped in `RGXClassWrapperToken`.

**Returns:** `RGXClassToken` - The stored value (after wrapping, if applicable).

### rgxConstant
```typescript
function rgxConstant(name: RGXConstantName, cache?: boolean): RGXConstantToken
```

Creates a reference to an RGX constant by name (see [constant.md](./class/token/constant.md)). It resolves like the constant, and its JSON form stores the name, so the link to the constant survives serialization. Throws an `RGXInvalidConstantKeyError` if no constant with the given name exists.
- `name` (`RGXConstantName`): The name of the constant.
- `cache` (`boolean`, optional): Whether the reference keeps the constant's token after looking it up the first time, instead of looking it up every time it is used. Defaults to `false`.

**Returns:** `RGXConstantToken` - A new reference to the constant.

### rgxConstantValue
```typescript
function rgxConstantValue(name: RGXConstantName): RGXClassToken
```

Retrieves the token an RGX constant is defined as (after wrapping, if applicable), rather than a reference to it. This is the same object every time, so changes made to it affect every use of the constant. Throws an `RGXInvalidConstantKeyError` if no constant with the given name exists.

### deleteRGXConstant
```typescript
function deleteRGXConstant(name: RGXConstantName): RGXClassToken
```

Deletes an existing RGX constant by name, and returns the token it was defined as, so it can be defined again later. References to the constant throw `RGXInvalidConstantKeyError` when used until a constant with the name is defined again, unless they cached it. Throws an `RGXInvalidConstantKeyError` if no constant with the given name exists.