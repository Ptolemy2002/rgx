# RGX
A library for easy construction and validation of regular expressions in TypeScript. You can use `rgx` to concatenate various types of tokens into a valid regular expression string, with type safety and validation. You can also use a combination of `RGXWalker`, `RGXPart`, and plain tokens to create powerful matchers that can validate partial matches and transform captured values with custom logic.

All public components are exported at the main module entry point.

**Note**: This library is tested with nearly 100% coverage, but any override of `RGXClassToken.clone()` does not have the depth parameter fully tested, as that is ultimately part of `@ptolemy2002/immutability-utils`, which is tested, and setting up tests for that functionality is exceedingly complex.

# Table of Contents
Because there is so much to document, it has been broken up into multiple files. The following is a list of the documentation files for this library:
- [type-reference](./docs/type-reference.md) - A reference for all public types used in the library.
- [general](./docs/general.md) - General utilities of the library, including tagged template functions for creating regular expressions and walkers.
- [type-guards](./docs/type-guards.md) - Type guards for validating various types of tokens and string values.
- [ExtRegExp](./docs/ExtRegExp.md) - The `ExtRegExp` class, which extends the built-in `RegExp` class with the ability to create custom flags that transform the source string of the regular expression before it is compiled.
- [constants](./docs/constants.md) - Constants provided by the library, such as predefined character classes and tokens.
- `util` - A directory containing documentation for various utility functions provided by the library.
  - [clone](./docs/util/clone.md) - The `cloneRGXToken` function, which creates a clone of a given RGX token to a specified depth.
  - [escapeRegex](./docs/util/escapeRegex.md) - The `escapeRegex` function, which escapes special regex characters in a given string and assures you that the result is valid Regex.
  - [regexMatchAtPosition](./docs/util/regexMatchAtPosition.md) - The `regexMatchAtPosition` function and related functions, which attempt to match a given regular expression at a specific position in a string.
  - [regexWithFlags](./docs/util/regexWithFlags.md) - The `regexWithFlags` function, which creates a new regular expression with the same source as a given regular expression but with different flags.
  - [createRGXClassGuardFunction](./docs/util/createRGXClassGuardFunction.md) - The `createRGXClassGuardFunction` and `createAssertRGXClassGuardFunction` utilities for creating type guard and assertion functions for class instances.
- `class` - A directory containing documentation for all classes in the library.
  - [collection](./docs/class/collection.md) - The `RGXTokenCollection` class, which is a collection of tokens.
  - [RGXError](./docs/class/RGXError.md) - Details on all custom error classes and the base `RGXError` class.
  - [walker](./docs/class/walker.md) - Details on both `RGXWalker` and `RGXPart`, which are used for creating custom matchers that can validate partial matches and transform captured values with custom logic.
  - [lexer](./docs/class/lexer.md) - Details on `RGXLexer`, which tokenizes a source string into structured lexemes using named lexeme definitions grouped by mode.
  - `token` - A directory containing documentation for all token classes in the library, which are classes that represent specific types of tokens that can be used in regular expressions.
    - [base](./docs/class/token/base.md) - The `RGXClassToken` class, which is the base class for all token classes in the library.
    - [group](./docs/class/token/group.md) - The `RGXGroupToken` class, which represents a group of tokens that can be treated as a single unit in a regular expression.
    - [repeat](./docs/class/token/repeat.md) - The `RGXRepeatToken` class, which represents a token that can be repeated a range of times in a regular expression. This also covers optional syntax.
    - [union](./docs/class/token/union.md) - The `RGXClassUnionToken` class, which represents a union of tokens that can match any one of the tokens in the union.
    - [subpattern](./docs/class/token/subpattern.md) - The `RGXSubpatternToken` class, which re-matching the content of a previous capturing group.
    - [wrapper](./docs/class/token/wrapper.md) - The `RGXClassWrapperToken` class, which represents a class token that can wrap any arbitrary token (even non-class), giving you the benefit of the class API for any token.
    - [to](./docs/class/token/to.md) - A utility for converting any token into a class token. Most tokens just get wrapped in a `RGXClassWrapperToken`, but some do not.
    - `lookaround` - A directory containing documentation for lookahead and lookbehind tokens.
      - [base](./docs/class/token/lookaround/base.md) - The `RGXLookaroundToken` class, which is the base class for lookahead and lookbehind tokens.
      - [lookahead](./docs/class/token/lookaround/lookahead.md) - The `RGXLookaheadToken` class, which represents a lookahead assertion in a regular expression.
      - [lookbehind](./docs/class/token/lookaround/lookbehind.md) - The `RGXLookbehindToken` class, which represents a lookbehind assertion in a regular expression.

## Peer Dependencies
- `@ptolemy2002/immutability-utils` ^2.0.0
- `@ptolemy2002/js-utils` ^3.2.2
- `@ptolemy2002/ts-brand-utils` ^1.0.0
- `@ptolemy2002/ts-utils` ^3.4.0
- `is-callable` ^1.2.7
- `lodash.clonedeep` ^4.5.0

## Commands
The following commands exist in the project:

- `npm run uninstall` - Uninstalls all dependencies for the library
- `npm run reinstall` - Uninstalls and then Reinstalls all dependencies for the library
- `npm run build` - Builds the library
- `npm run release` - Publishes the library to npm without changing the version
- `npm run release-patch` - Publishes the library to npm with a patch version bump
- `npm run release-minor` - Publishes the library to npm with a minor version bump
- `npm run release-major` - Publishes the library to npm with a major version bump
- `npm run test` - Runs the tests for the library
- `npm run test:watch` - Runs the tests for the library in watch mode
- `npm run test:coverage` - Runs the tests for the library and generates a coverage report