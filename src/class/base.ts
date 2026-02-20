import { RGXConvertibleTokenOutput, ValidRegexString } from "src/types";
import { RGXTokenCollectionInput } from "src/collection";
import { RGXNotImplementedError } from "src/errors";
import { resolveRGXToken } from "src/resolve";

export abstract class RGXClassToken {
    abstract toRgx(): RGXConvertibleTokenOutput

    get isGroup() {
        return false;
    }

    or(...others: RGXTokenCollectionInput[]): RGXClassToken {
        throw new RGXNotImplementedError('RGXClassToken.or(...others)', 'call rgxClassInit() first.')
    }

    resolve(): ValidRegexString {
        return resolveRGXToken(this);
    }
}