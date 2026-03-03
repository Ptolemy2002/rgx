# Type Reference
The following is a reference to types relevant to the function listed in this file. The full type reference for the library can be found in [type-reference.md](./type-reference.md).

```typescript
const validRegexSymbol = Symbol('rgx.ValidRegex');
type ValidRegexBrandSymbol = typeof validRegexSymbol;
type ValidRegexString = Branded<string, [ValidRegexBrandSymbol]>;
```

# escapeRegex
```typescript
function escapeRegex(value: string): ValidRegexString
```
Escapes special regex characters in the given string and brands the result as a `ValidRegexString`.

## Parameters
  - `value` (`string`): The string to escape.

## Returns
- `ValidRegexString`: The escaped string, branded as a valid regex string.