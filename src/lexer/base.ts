import { RGXToken } from "src/types";
import { resolveRGXToken } from "src/resolve";
import { 
    assertInRange, RGXInvalidLexerModeError,
    LexemeNotMatchedCause, RGXLexemeNotMatchedAtPositionError,
    isLexemeNotMatchedCauseError, RGXInvalidLexerError
} from "src/errors";
import { RGXTokenOrPart, RGXWalker, RGXWalkerOptions } from "src/walker";
import { assertRegexMatchesAtPosition, createRegex, regexMatchAtPosition } from "src/utils";
import { createAssertRGXClassGuardFunction, createRGXClassGuardFunction } from "src/utils";
import { rgxConstant } from "src/constants";

export type RGXLexemeDefinition<Data, Share=unknown> = Readonly<({
    type: "resolve",
    token: RGXToken
} | {
    type: "walk",
    tokens: RGXTokenOrPart<Data, Share>[],
    // The lexer needs complete control over the source position and the source,
    // so we omit startingSourcePosition and do not allow source specification.
    options?: Omit<RGXWalkerOptions<Data, Share>, "startingSourcePosition" | "reduced" | "share"> & {
        // Wrap reduced in a function to prevent mutable data from being reused
        // as new walkers are created with the same lexeme definition.
        reduced?: (() => Data) | null
        share?: (() => Share) | null
    }
}) & {
    id: string,
    priority?: number
}>;

export type RGXLexeme<Data> = {
    id: string,
    raw: string,
    start: RGXLexemeLocation,
    end: RGXLexemeLocation,
    data?: Data
};

export type RGXLexemeDefinitions<Data, Share=unknown> = Readonly<Record<string, ReadonlyArray<RGXLexemeDefinition<Data, Share>>>>;
type MutableRGXLexemeDefinitions<Data, Share=unknown> = Record<string, ReadonlyArray<RGXLexemeDefinition<Data, Share>>>;

export type RGXLexemeLocation = {
    index: number;
    line: number;
    column: number;
};

export function rgxLexemeLocationFromIndex(source: string, index: number): RGXLexemeLocation {
    assertInRange(index, { min: 0, max: source.length }, "index is outside the bounds of the source string");

    const lines = source.slice(0, index).split("\n");
    const line = lines.length;
    const column = lines[lines.length - 1]!.length + 1;
    return { index, line, column };
}

export class RGXLexer<Data, Share=unknown> {
    readonly source: string;
    _position: number;

    // Map mode to the lexeme definitions for that mode.
    readonly lexemeDefinitions: RGXLexemeDefinitions<Data, Share>;
    readonly matched: RGXLexeme<Data>[] = [];

    static check = createRGXClassGuardFunction(RGXLexer);
    static assert = createAssertRGXClassGuardFunction(RGXLexer, (value, c) => new RGXInvalidLexerError("Invalid Lexer", value, c.name));

    get position() {
        return this._position;
    }

    set position(value: number) {
        assertInRange(value, { min: 0, max: this.source.length }, "position is outside the bounds of the source string");
        this._position = Math.floor(value);
    }

    constructor(
        source: string,
        lexemeDefinitions: RGXLexemeDefinitions<Data, Share> = {},
        startingPosition: number = 0
    ) {
        // Copy to ensure we don't modify the original, which will be used across constructions.
        const lexemeDefinitionsCopy = { ...lexemeDefinitions } as MutableRGXLexemeDefinitions<Data, Share>;
        
        lexemeDefinitionsCopy["default"] ??= [];

        this.source = source;

        this.lexemeDefinitions = Object.fromEntries(
            Object.entries(lexemeDefinitionsCopy).map(
                ([mode, defs]) => [
                    mode, [...defs].sort(
                        // Sort by priority, with higher priority first. If no priority is specified, it defaults to 0.
                        (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
                    )
                ]
            )
        );

        this.position = startingPosition;
    }

    private matchDefinition(lexemeDefinition: RGXLexemeDefinition<Data, Share>, advance: boolean): RGXLexeme<Data> {
        const id = lexemeDefinition.id;
        const startPosition = this.position;
        let endPosition: number;
        let raw: string;
        let dataPart: {data?: Data} = {};

        if (lexemeDefinition.type === "resolve") {
            const { token } = lexemeDefinition;
            const regex = createRegex(resolveRGXToken(token));

            // Since the assertion will throw an error if there is no match, this is safe.
            const match = assertRegexMatchesAtPosition(regex, this.source, startPosition, 10, true);

            raw = match[0];
            endPosition = startPosition + raw.length;
            
            // No data part for token lexemes.
        } else {
            const { tokens, options: {reduced, share, ...options}={} } = lexemeDefinition;

            const walker = new RGXWalker<Data, Share>(this.source, tokens, {
                ...options,
                reduced: reduced?.() ?? undefined,
                share: share?.() ?? undefined,
                startingSourcePosition: startPosition
            });
            
            // Since the walker will throw an error if it fails to match to the end of its tokens (assuming it isn't stopped before then), this is safe.
            walker.walk();

            raw = this.source.slice(startPosition, walker.sourcePosition);
            endPosition = walker.sourcePosition;
            dataPart.data = walker.reduced;
        }

        if (advance) {
            this.position = endPosition;
        }
        
        return {
            id,
            raw,
            start: rgxLexemeLocationFromIndex(this.source, startPosition),
            end: rgxLexemeLocationFromIndex(this.source, endPosition),
            ...dataPart
        };
    }

    private next(mode: string, advance: boolean, log: boolean): RGXLexeme<Data> | null {
        if (this.isAtEnd()) return null;

        this.validateMode(mode);
        const lexemeDefs = this.lexemeDefinitions[mode]!;
        const causes: LexemeNotMatchedCause[] = [];
        for (const lexemeDef of lexemeDefs) {
            try {
                const lexeme = this.matchDefinition(lexemeDef, advance);
                if (advance && log) this.matched.push(lexeme);
                return lexeme;
            } catch (e) {
                if (isLexemeNotMatchedCauseError(e)) {
                    // Log the error as a cause and continue trying other lexeme definitions.
                    causes.push({ id: lexemeDef.id, error: e });
                } else {
                    // If it's an unexpected error, rethrow it.
                    throw e;
                }
            }
        }

        // If no lexeme definitions matched, throw an error.
        throw new RGXLexemeNotMatchedAtPositionError("No lexeme definition matched", this.source, mode, this.position, causes);
    }

    private expect(id: string, mode: string, consume: boolean, log: boolean): RGXLexeme<Data> {
        const lexeme = consume ? this.consume(mode, log) : this.peek(mode);

        if (!lexeme || lexeme.id !== id) {
            throw new RGXLexemeNotMatchedAtPositionError(
                `Expected lexeme "${id}" but got ${lexeme?.id ? `lexeme "${lexeme.id}"` : "source end"}`,
                this.source, mode, this.position
            );
        }

        return lexeme;
    }

    validateMode(value: string) {
        if (!(value in this.lexemeDefinitions)) {
            throw new RGXInvalidLexerModeError("Lexer mode does not exist in this lexer", value);
        }
    }

    lastMatched(): RGXLexeme<Data> | null {
        if (this.matched.length === 0) return null;
        return this.matched[this.matched.length - 1]!;
    }

    hasNext(): boolean {
        return this.position < this.source.length;
    }

    isAtEnd(): boolean {
        return !this.hasNext();
    }

    remaining(): string {
        return this.source.slice(this.position);
    }

    backtrack(tokens = 1): void {
        if (tokens <= 0) return;
        assertInRange(tokens, { max: this.matched.length }, "Cannot backtrack more tokens than have been matched");
        const targetLexeme = this.matched[this.matched.length - tokens]!;
        this.position = targetLexeme.start.index;
        this.matched.splice(this.matched.length - tokens, tokens);
    }

    consume(mode="default", log = true) {
        return this.next(mode, true, log);
    }

    peek(mode = "default") {
        return this.next(mode, false, false);
    }

    expectConsume(id: string, mode = "default", log = true): RGXLexeme<Data> {
        return this.expect(id, mode, true, log);
    }

    expectPeek(id: string, mode = "default"): RGXLexeme<Data> {
        return this.expect(id, mode, false, false);
    }

    skip(count = 1, mode = "default"): void {
        for (let i = 0; i < count; i++) {
            if (!this.hasNext()) break;
            this.consume(mode, false);
        }
    }

    skipWhitespace(): void {
        if (this.isAtEnd()) return;
        const regex = createRegex(resolveRGXToken(rgxConstant("whitespace-block")));
        const match = regexMatchAtPosition(regex, this.source, this.position, true);

        if (match !== null) {
            this.position += match[0].length;
        }
    }

    consumeAll(mode = "default", skipWhitespace=true): RGXLexeme<Data>[] {
        const lexemes: RGXLexeme<Data>[] = [];
        while (this.hasNext()) {
            if (skipWhitespace) this.skipWhitespace();
            const lexeme = this.consume(mode);
            if (lexeme) lexemes.push(lexeme);
        }
        return lexemes;
    }

    consumeWhile(predicate: (lexeme: RGXLexeme<Data>) => boolean, mode = "default", skipWhitespace=true): RGXLexeme<Data>[] {
        const lexemes: RGXLexeme<Data>[] = [];
        while (this.hasNext()) {
            if (skipWhitespace) this.skipWhitespace();
            const next = this.consume(mode);
            if (!next || !predicate(next)) break;
            lexemes.push(next);
        }

        return lexemes;
    }

    consumeUntil(predicate: (lexeme: RGXLexeme<Data>) => boolean, mode = "default", skipWhitespace=true): RGXLexeme<Data>[] {
        return this.consumeWhile(lexeme => !predicate(lexeme), mode, skipWhitespace);
    }
}

export const rgxLexer = <Data, Share = unknown>(
    ...args: ConstructorParameters<typeof RGXLexer<Data, Share>>
): RGXLexer<Data, Share> => new RGXLexer(...args);