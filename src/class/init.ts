import { RGXClassToken } from "./base";
import { expandRgxUnionTokens, RGXClassUnionToken } from "./union";
import { RGXTokenCollection, RGXTokenCollectionInput } from "src/collection";

export function rgxClassInit() {
    // Patch RGXClassToken here, Since classes like RGXClassUnionToken are instances of RGXClassToken
    // themselves. If we tried to import RGXClassUnionToken in base.ts, it would cause a circular dependency.
    
    RGXClassToken.prototype.or = function (this: RGXClassToken, ...others: RGXTokenCollectionInput[]): RGXClassToken {
        if (others.length === 0) return new RGXClassUnionToken([this]);

        const expandedOthers: RGXTokenCollection = expandRgxUnionTokens(...others);
        // Remove any instances of this token itself
        const filteredOthers = expandedOthers.tokens.filter(token => token !== this);

        if (this instanceof RGXClassUnionToken) {
            return new RGXClassUnionToken([...this.tokens, ...filteredOthers]);
        } else {
            return new RGXClassUnionToken([this, ...filteredOthers]);
        }
    };
}