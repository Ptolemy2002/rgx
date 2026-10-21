import rgx, {
    rgxa, rgxwa, rgxConcat, resolveRGXToken, rgxTokenToJSON, isRGXSingletonToken, isRGXConvertibleToken,
    RGXClassToken, RGXClassWrapperToken, RGXGroupToken, RGXLookaheadToken, RGXRepeatToken, RGXExclusionToken,
    RGXClassUnionToken, RGXInsertionRejectedError, RGXInvalidTokenError, RGXPart,
    RGXInsertionContext, RGXToken, registerRGXJSONClassToken, unregisterRGXJSONClass, createRGXJSONClassToken
} from "src/index";
import { expectError } from "./utils";

// A convertible token that records the context of every insertion check.
function recordingToken(source: string = "x", accept: (context: RGXInsertionContext) => string | boolean = () => true) {
    const contexts: RGXInsertionContext[] = [];
    const token = {
        toRgx: () => source,
        rgxAcceptInsertion: (context: RGXInsertionContext) => {
            contexts.push(context);
            return accept(context);
        }
    };

    return { token, contexts };
}

class RecordingClassToken extends RGXClassToken {
    static contexts: RGXInsertionContext[] = [];

    rgxAcceptInsertion(context: RGXInsertionContext) {
        RecordingClassToken.contexts.push(context);
        return true;
    }

    toRgx() {
        return "y";
    }

    clone() {
        return this;
    }

    static fromJSON() {
        return new RecordingClassToken();
    }

    toJSON() {
        return createRGXJSONClassToken("RecordingClassToken");
    }
}

// The indices from the top level of the pattern to the context.
function path(context: RGXInsertionContext): number[] {
    const result: number[] = [];
    for (let level: RGXInsertionContext | null = context; level !== null; level = level.parent) result.unshift(level.index);
    return result;
}

beforeEach(() => {
    RecordingClassToken.contexts = [];
});

describe("insertion context", () => {
    it("describes the top level of the pattern", () => {
        const { token, contexts } = recordingToken();
        const tokens = ["a", token, "b"];
        rgxa(tokens, "gi");

        expect(contexts).toHaveLength(1);
        expect(contexts[0]).toEqual({ flags: "gi", siblings: tokens, index: 1, parent: null, container: null });
        expect(Object.isFrozen(contexts[0])).toBe(true);
    });

    it("checks each top-level placement exactly once", () => {
        const { token, contexts } = recordingToken();
        rgxa([token, "a", token]);
        expect(contexts.map(c => c.index)).toEqual([0, 2]);

        const { token: token2, contexts: contexts2 } = recordingToken();
        rgx("m")`a${token2}b`;
        expect(contexts2).toHaveLength(1);
        expect(contexts2[0]!.flags).toBe("m");
    });

    it("checks tokens nested in groups, with the group as the container", () => {
        const { token, contexts } = recordingToken();
        const group = new RGXGroupToken({}, ["a", token]);
        rgxa(["b", group]);

        expect(contexts).toHaveLength(1);
        const [context] = contexts;
        expect(context!.index).toBe(1);
        expect(context!.siblings).toEqual(["a", token]);
        expect(context!.container).toBe(group);
        expect(context!.parent).toMatchObject({ index: 1, container: null, parent: null });
        expect(context!.parent!.siblings[1]).toBe(group);
    });

    it("includes the flags of modifier groups", () => {
        const { token, contexts } = recordingToken();
        rgxa([new RGXGroupToken({ flags: "i" }, [token]), new RGXGroupToken({}, [token])], "gm");

        expect(contexts.map(c => c.flags)).toEqual(["gi", "gm"]);
    });

    it("checks tokens nested in every kind of container", () => {
        const { token, contexts } = recordingToken();
        const containers: RGXToken[] = [
            new RGXLookaheadToken([token]),
            new RGXRepeatToken(token, 2),
            new RGXClassUnionToken([token, "a"]),
            new RGXGroupToken({ capturing: false }, [token, "b"]),
            new RGXGroupToken({}, ["c", token]),
            new RGXClassWrapperToken(token),
            new RGXExclusionToken("ex", token, ["d"], token),
            ["e", token],
            [token],
            { toRgx: () => token }
        ];

        rgxa(containers);
        // The exclusion token places its token and terminal separately, and the wrapper passes its own placement
        // to the wrapped token before the wrapped token is placed inside it.
        expect(contexts).toHaveLength(containers.length + 2);
        expect(contexts.map(c => c.parent === null)).toEqual(contexts.map((_, i) => i === 5));
        expect(contexts.map(c => path(c)[0])).toEqual([0, 1, 2, 3, 4, 5, 5, 6, 6, 7, 8, 9]);
    });

    it("checks JSON class tokens through the class tokens they convert to", () => {
        registerRGXJSONClassToken("RecordingClassToken", RecordingClassToken);

        try {
            const json = rgxTokenToJSON(new RGXGroupToken({}, ["a", new RecordingClassToken()]));
            rgxa([json]);
            expect(RecordingClassToken.contexts).toHaveLength(1);
            expect(path(RecordingClassToken.contexts[0]!)).toEqual([0, 1]);
        } finally {
            unregisterRGXJSONClass("RecordingClassToken");
        }
    });

    it("rejects nested tokens, reporting their location", () => {
        const { token } = recordingToken("x", () => "nope");
        const group = new RGXGroupToken({}, ["a", new RGXLookaheadToken([token])]);

        expectError(() => rgxa(["b", group]), RGXInsertionRejectedError, error => {
            expect(error.message).toBe("Insertion rejected; Reason: nope; Additional info: index 1 > 1 > 0 (inside RGXGroupToken > RGXLookaheadToken), token type unknown");
            expect(path(error.context!)).toEqual([1, 1, 0]);
        });

        expectError(() => rgxa([[token, "a"], new RGXGroupToken({}, [token]), new RGXClassWrapperToken({ toRgx: () => token })]), RGXInsertionRejectedError, error => {
            expect(error.message).toContain("index 0 > 0 (inside array)");
        });

        expectError(() => rgxa([{ toRgx: () => token }]), RGXInsertionRejectedError, error => {
            expect(error.message).toContain("index 0 > 0 (inside convertible token)");
        });
    });

    it("lets tokens accept or reject based on their real flags", () => {
        const { token } = recordingToken("x", context => context.flags.includes("i") || "requires the i flag");
        expect(() => rgxa([new RGXGroupToken({ flags: "i" }, [token])])).not.toThrow();
        expect(() => rgxa([new RGXGroupToken({}, [token])], "i")).not.toThrow();
        expect(() => rgxa([new RGXGroupToken({ flags: "m" }, [token])], "i")).toThrow(RGXInsertionRejectedError);
    });

    it("does not check insertions outside of a pattern being built", () => {
        const { token, contexts } = recordingToken();
        const group = new RGXGroupToken({}, [token]);

        resolveRGXToken(group);
        rgxConcat([token, group]);
        group.toJSON();
        rgxTokenToJSON({ toRgx: () => group });
        new RGXClassWrapperToken({ toRgx: () => group }).toJSON();
        isRGXSingletonToken(group);
        expect(contexts).toHaveLength(0);
    });

    it("does not check insertions while inspecting tokens during a build", () => {
        const { token, contexts } = recordingToken();
        // Constructing the repeat token inside toRgx() checks whether its token is repeatable, which resolves it.
        rgxa([{ toRgx: () => new RGXRepeatToken(new RGXGroupToken({}, [token]), 2) }]);
        expect(contexts).toHaveLength(1);
    });

    it("does not check insertions resolved by the hooks themselves", () => {
        const { token: inner, contexts: innerContexts } = recordingToken();
        const group = new RGXGroupToken({}, [inner]);
        const { token } = recordingToken("x", context => {
            context.siblings.forEach(sibling => resolveRGXToken(sibling));
            return true;
        });

        rgxa([token, group]);
        expect(innerContexts).toHaveLength(1);
    });

    it("stops checking after a build throws", () => {
        const { token, contexts } = recordingToken("x", () => false);
        expect(() => rgxa([token])).toThrow(RGXInsertionRejectedError);
        expect(() => rgxConcat([token])).not.toThrow();
        expect(contexts).toHaveLength(1);
    });

    it("handles tokens that are not equal to themselves", () => {
        expect(rgxa([NaN, new RGXGroupToken({}, [NaN])]).source).toBe("NaN(NaN)");
    });

    it("checks the tokens given to a walker, including nested ones and parts, without flags", () => {
        const { token, contexts } = recordingToken("a");
        const tokens = [token, new RGXPart(new RGXGroupToken({}, [token]))];
        rgxwa("aa", tokens);

        expect(contexts).toHaveLength(2);
        expect(contexts[0]).toMatchObject({ flags: "", index: 0, parent: null });
        expect(path(contexts[1]!)).toEqual([1, 0]);

        const { token: rejecting } = recordingToken("a", () => false);
        expect(() => rgxwa("a", [new RGXGroupToken({}, [rejecting])])).toThrow(RGXInsertionRejectedError);
    });

    it("does not call hooks when checking convertible tokens", () => {
        const { token, contexts } = recordingToken();
        expect(isRGXConvertibleToken(token)).toBe(true);
        expect(contexts).toHaveLength(0);
    });

    it("rejects hooks that return something other than a string or boolean when building a pattern", () => {
        const token = { toRgx: () => "a", rgxAcceptInsertion: () => 42 as unknown as boolean };
        expect(() => rgxa([token])).toThrow(RGXInvalidTokenError);
    });
});
