import { RGXToken, ValidRegexString } from "src/types";
import { RGXTokenCollectionInput } from "src/collection";
import { RGXNotImplementedError } from "src/errors";
import { resolveRGXToken } from "src/resolve";
import type { RGXClassUnionToken } from "./union";

export abstract class RGXClassToken {
    abstract toRgx(): RGXToken

    get isGroup() {
        return false;
    }

    or(...others: RGXTokenCollectionInput[]): RGXClassUnionToken {
        throw new RGXNotImplementedError('RGXClassToken.or(...others)', 'call rgxClassInit() first.')
    }

    resolve(): ValidRegexString {
        return resolveRGXToken(this);
    }
}