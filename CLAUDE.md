This project is part of a git repository, and the folder this file is in is the root. Do not assume that the repository is in any path other than this one.

The project is a Regular Expression library with all source files in `./src` and all test files in `./test`. Before attempting to explore the codebase, run `ls` on these folders specifically to get a sense of the file structure and avoid needing to read more than necessary in your exploration. The codebase contains some TypeScript files that are standalone, and some folders containing multiple files and one `index.ts` file that exports the contents of the folder. For this reason, `index.ts` is generally unnecessary to read unless it is `./src/index.ts` specifically.

`./src/index.ts` exports all of the subfolders (except `internal`), so any public component can be imported directly from there.

`./README.md` should contain documentation for every public component, so reading that is a good way to give you an overview without needing to search specific sections. Reading just the "RGX" section (top-level heading) gives you a very high-level overview of what the library is. Other sections have details. Notably, you may be given a task in a state where there are currently unstaged changes or untracked files, in which case `./README.md` may not be up to date. If you find yourself needing to check for any additions, use `git status` and `git diff`.

While `./src/types.ts` contains most types, there are some types that are exported directly from their respective files. The "Type Reference" section of the README contains all types.

The `test` directory contains tests for all public and internal components, aiming for 100% collective test coverage. They are organized similarly to `src`, but not exactly. Notably, individual test files may not cover all functionality, because the functionality is being provided by another component with its own tests in other files. So, don't get too ambitious and try to make tests that cover every possible case, since that will likely end up being redundant.

You can run `npm run test` to run all tests, and `npm run test:coverage` to run tests with a coverage report. In most cases, the printed coverage report in the terminal is sufficient, but if you want to see the detailed report, you can see `./coverage/lcov-report/index.html`.