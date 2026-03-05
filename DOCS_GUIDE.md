# Documentation Writing Guide

This file instructs AI models on how to create new documentation files for this library. Read this before creating any new docs file.

## File Placement

Documentation lives in `./docs/`. The subdirectory mirrors the `./src/` structure:

| What you're documenting | Where to put the doc |
|---|---|
| A standalone utility function | `docs/util/<name>.md` |
| A class | `docs/class/<name>.md` |
| A token class | `docs/class/token/<name>.md` |
| A lookaround token class | `docs/class/token/lookaround/<name>.md` |
| Top-level exports (general functions, tagged templates) | `docs/general.md` (append to existing file) |
| A new top-level category | A new `docs/<name>.md` file |

Use the source filename (without `.ts`) as the doc filename. For a folder with an `index.ts`, use the folder name.

After creating a new file, **add an entry for it in `./README.md`** under the Table of Contents, following the existing list format.

## File Structure

Every docs file follows this exact structure:

### 1. Type Reference Section (always first)

```markdown
# Type Reference
The following is a reference to types relevant to the [function|class|classes|components] listed in this file. The full type reference for the library can be found in [type-reference.md](<relative-path-to-docs/type-reference.md>).

```typescript
// Only include types actually used in the signatures or descriptions below.
// For external types, include an import statement and an inline comment showing the type definition.
// Example:
import { CloneDepth } from "@ptolemy2002/immutability-utils";
// type CloneDepth = number | "max";
```
```

The relative path to `type-reference.md` changes by nesting depth:
- `docs/*.md` → `./type-reference.md`
- `docs/util/*.md` → `../type-reference.md`
- `docs/class/*.md` → `../type-reference.md`
- `docs/class/token/*.md` → `../../type-reference.md`
- `docs/class/token/lookaround/*.md` → `../../../type-reference.md`

Only include types that appear directly in the component's signatures or descriptions. Do not include the full type reference — just the relevant subset. Check `./docs/type-reference.md` for the canonical definitions.

### 2. Component Section(s)

The rest of the file documents the actual component(s). See the templates below.

---

## Templates

### Function

```markdown
# functionName
```typescript
function functionName(param1: Type1, param2?: Type2): ReturnType
```
One or two sentence description of what the function does and why you'd use it.

## Parameters
  - `param1` (`Type1`): Description of the parameter.
  - `param2` (`Type2`, optional): Description. Include what happens if omitted.

## Returns
- `ReturnType`: Description of the return value and any guarantees about it.
```

- If the function is a factory (returns another function), document both levels of parameters under separate `**Direct**` and `**[Returned function name]**` bold headers within `## Parameters`, matching the style in `docs/general.md`.
- If the function throws errors, mention the error class and condition in the parameter or description prose (not a separate section).
- Add examples only when the behavior is non-obvious. Use a fenced `typescript` block. See `docs/general.md` for the example style.

### Class

```markdown
# ClassName
Description of what the class does and its role in the library. Mention if a convenience function exists for constructing instances without `new`.

## Static Properties
- `check(value: unknown): value is ClassName`: ...
- `assert(value: unknown): asserts value is ClassName`: ...

## Constructor
```typescript
constructor(param1: Type1, param2: Type2 = defaultValue)
```
- `param1` (`Type1`): Description.
- `param2` (`Type2`, optional): Description. Defaults to `defaultValue`.

## Properties
- `propertyName` (`Type`): Description.
- `methodName(...) => ReturnType`: Description.

## Methods
- `methodName(param: Type) => ReturnType`: Description.
```

- Mark abstract classes with `# ClassName (abstract)` in the heading.
- Put abstract methods in a separate `## Abstract Methods` section before `## Properties`.
- Properties with only getters get a note: "These properties only have getters."
- For inherited/standard interface implementations (e.g., array methods), add a prose paragraph at the bottom of the file describing them rather than listing each individually. See `docs/class/collection.md` for an example.

### Multiple related components in one file

When a file documents more than one export (e.g., `docs/general.md` documents `rgx`, `rgxa`, and `resolveRGXToken`), list each component as a top-level `#` section in the same file. The Type Reference section at the top should cover all types used across all components in the file.

---

## Style Rules

- **Tense and voice**: Use present tense, third-person ("Returns...", "Creates...", "Throws..."). Do not use second-person ("You can...") in signatures or parameter lists; it's acceptable in prose descriptions.
- **Optional parameters**: Always note `(optional)` after the type. State the default value and the behavior when omitted.
- **Cross-references**: Link to other docs files using relative Markdown links. Always use the path relative to the current file.
- **Type names in prose**: Wrap type names, parameter names, and values in backticks (e.g., `` `RGXToken` ``, `` `true` ``, `` `"max"` ``).
- **No redundant headings**: Do not add a "Description" heading — just write the description paragraph directly under the component heading.
- **Error behavior**: Document thrown errors inline in the relevant parameter description or at the end of the main description, not in a separate section.

---

## Keeping Docs in Sync

When you update a type that already appears in the `# Type Reference` section of any docs file, search `./docs` for all files that include that type and update them. Types are listed redundantly across files for ease of reference. Use:

```
grep -r "TypeName" ./docs
```

Also check `./docs/type-reference.md` and update the canonical definition there first.

When you add a new public export, ensure it is documented and listed in `./README.md`. Run `git status` to check for undocumented additions.
