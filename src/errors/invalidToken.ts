import { RGXError } from "src/errors";
import { RGXTokenTypeFlat } from "src/types";
import { listInPlainEnglish } from "@ptolemy2002/js-utils";
import { RGXClassToken } from "src/class";

const tokenExpectationMap: Record<RGXTokenTypeFlat, string[]> = {
    'no-op': ['null', 'undefined'],
    'literal': ['RegExp', 'ExtRegExp'],
    'native': ['string', 'number', 'boolean', 'null', 'undefined'],
    'convertible': ['object with a toRgx method that returns a valid native/literal token or an array of valid native/literal tokens'],
    'array': ['array of native/literal/convertible tokens'],
    'class': ['instance of RGXClassToken'],
    'json': ['JSON-serializable native token', 'object with $rgx set to true and either a regex source (with optional flags) or a registered class name (with optional args)', 'array of JSON tokens']
} as const;

export type ExpectedTokenType = {
    type: "tokenType";
    values: RGXTokenTypeFlat[];
} | {
    type: "custom";
    values: string[];
};

export class RGXInvalidTokenError extends RGXError {
    expected: string;
    got: unknown;

    setExpected(expected: ExpectedTokenType | null): string {
        let result: string;

        if (expected === null) {
            // Add them all
            const uniqueValues: Set<string> = new Set();
            for (const tokenType in tokenExpectationMap) {
                tokenExpectationMap[tokenType as RGXTokenTypeFlat].forEach(e => uniqueValues.add(e));
            }
            result = listInPlainEnglish(Array.from(uniqueValues), { conjunction: 'or' });
        } else if (expected.type === 'tokenType') {
            const uniqueValues: Set<string> = new Set();
            for (const tokenType of expected.values) {
                const expectations = tokenExpectationMap[tokenType];
                if (expectations) {
                    expectations.forEach(e => uniqueValues.add(e));
                }
            }
            result = listInPlainEnglish(Array.from(uniqueValues), { conjunction: 'or' });
        } else {
            result = listInPlainEnglish(expected.values, { conjunction: 'or' });
        }
        
        this.expected = `[${result}]`;
        return this.expected;
    }

    constructor(message: string, expected: ExpectedTokenType | null, got: unknown) {
        super(message, 'INVALID_RGX_TOKEN');
        this.name = 'RGXInvalidTokenError';
        this.got = got;
        this.setExpected(expected);
    }

    calcMessage(message: string) {
        let gotString: string;
        if (RGXClassToken.check(this.got)) {
            gotString = `instance of ${this.got.constructor.name}`;
        } else {
            try {
                gotString = JSON.stringify(this.got) ?? String(this.got);
            } catch {
                // Values like BigInts and circular structures cannot be stringified as JSON.
                gotString = String(this.got);
            }
        }
        return `${message}; Expected: ${this.expected}; Got: [${gotString}]`;
    }
}