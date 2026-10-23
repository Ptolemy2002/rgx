import { RGXGroupToken } from "src/class";
import { RGXToken } from "src/types";
import { RGXPart, RGXWalkerStep } from "src/walker";

export function rgxTaggedTemplateToArray<R = unknown, S = unknown, T = unknown>(
    _strings: TemplateStringsArray, tokens: RGXWalkerStep<R, S, T>[], multiline: boolean, verbatim: boolean
): RGXWalkerStep<R, S, T>[] {
    // Process the strings with escape sequences left alone.
    const strings = _strings.raw;
    const array: RGXWalkerStep<R, S, T>[] = [];

    for (let i = 0; i < Math.max(strings.length, tokens.length); i++) {
        const isTokensEnd = i >= tokens.length;
        const string = strings[i];
        const token = tokens[i];

        // Strings always come before tokens
        if (string !== undefined) {
            if (!multiline) {
                if (verbatim) array.push(string);
                else array.push({ rgxInterpolation: string });
            } else {
                const startsNewLine = string.startsWith("\n");

                // Remove all empty lines, remove comments, and trim whitespace from the start of each line.
                let lines = string
                    .split("\n")
                    /*
                        This check makes sure
                        `
                            foo |
                            ${'bar'} |
                            baz
                        `

                        resolves to "foo | bar |baz" instead of "foo | bar|baz"
                    */
                    .map((line, i) => (i !== 0 || startsNewLine) ? line.trimStart() : line)
                    // Remove comments from the start of the line.
                    .filter(line => !line.startsWith("//"))
                    .filter(line => line.length > 0)
                    // Remove comments from the end of the line.
                    .map(line => {
                        const commentIndex = line.indexOf("//");
                        if (commentIndex !== -1) {
                            return line.substring(0, commentIndex).trimEnd();
                        }
                        return line;
                    })
                    .join("")
                ;

                if (verbatim) array.push(lines);
                else array.push({ rgxInterpolation: lines });
            }
        }
        if (!isTokensEnd) array.push(token);
    }

    return array;
}
// Combines each run of adjacent steps that contain no parts into a single step, so the run is matched as one regex.
// Steps that contain parts are kept on their own, since each one handles its own capture.
export function rgxMergeWalkerSteps<R = unknown, S = unknown, T = unknown>(steps: RGXWalkerStep<R, S, T>[]): RGXWalkerStep<R, S, T>[] {
    const result: RGXWalkerStep<R, S, T>[] = [];
    let run: RGXToken[] = [];

    const flushRun = () => {
        // A single step is kept as-is.
        if (run.length === 1) result.push(run[0]!);
        else if (run.length > 1) result.push(new RGXGroupToken({ capturing: false }, run));
        run = [];
    };

    for (const step of steps) {
        if (stepContainsPart(step)) {
            flushRun();
            result.push(step);
        } else {
            run.push(step as RGXToken);
        }
    }
    flushRun();

    return result;
}

function stepContainsPart<R, S, T>(step: RGXWalkerStep<R, S, T>): boolean {
    if (Array.isArray(step)) return step.some(alternative => stepContainsPart(alternative));
    return RGXPart.check(step);
}
