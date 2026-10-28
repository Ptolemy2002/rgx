import { AST } from "@eslint-community/regexpp";
import { parseRegexSource } from "src/internal/analyzeRegexSource";
import { scanOptionsFromFlags } from "src/internal/scanRegexSource";

// V8 mishandles modifier groups that add or remove the i flag, so these rewrite them into equivalent patterns it reads
// correctly. Modifier groups that only set m or s are read correctly, so they are left alone.

type GroupLikeNode = AST.Group | AST.CapturingGroup | AST.LookaroundAssertion;
type LocalizableModifiers = { add: Set<string>, remove: Set<string> };

function isGroupLike(node: AST.Node): node is GroupLikeNode {
    if (node.type === 'Group' || node.type === 'CapturingGroup') return true;
    return node.type === 'Assertion' && (node.kind === 'lookahead' || node.kind === 'lookbehind');
}

function isCaseModifierGroup(node: AST.Node): node is AST.Group {
    if (node.type !== 'Group' || node.modifiers === null) return false;
    return node.modifiers.add.ignoreCase || node.modifiers.remove?.ignoreCase === true;
}

// The element itself, or the element a quantifier applies to.
function baseElement(element: AST.Element): AST.Element {
    return element.type === 'Quantifier' ? element.element : element;
}

function containsCharacterClass(node: AST.Element | AST.Alternative): boolean {
    if (node.type === 'Alternative') return node.elements.some(containsCharacterClass);
    if (node.type === 'CharacterClass' || node.type === 'ExpressionCharacterClass') return true;
    const base = baseElement(node);
    return isGroupLike(base) && base.alternatives.some(containsCharacterClass);
}

// Without the u or v flag, a character class in any alternative but the first of a disjunction inside a modifier
// group is read with the flags outside the modifier group: /(?i:a|[b])/ doesn't match "B". This is whether any
// disjunction in the alternatives (the alternatives themselves included) has such a class.
function hasMisreadAlternation(alternatives: readonly AST.Alternative[]): boolean {
    if (alternatives.slice(1).some(containsCharacterClass)) return true;
    return alternatives.some(alternative => alternative.elements.some(needsSplit));
}

function needsSplit(element: AST.Element): boolean {
    const base = baseElement(element);
    return isGroupLike(base) && hasMisreadAlternation(base.alternatives);
}

function modifiersOf(group: AST.Group, outer: LocalizableModifiers = { add: new Set(), remove: new Set() }): LocalizableModifiers {
    const result = { add: new Set(outer.add), remove: new Set(outer.remove) };
    const apply = (flags: AST.ModifierFlags | null, to: Set<string>, from: Set<string>) => {
        if (flags === null) return;
        for (const [flag, set] of [['i', flags.ignoreCase], ['m', flags.multiline], ['s', flags.dotAll]] as const) {
            if (!set) continue;
            to.add(flag);
            from.delete(flag);
        }
    };

    apply(group.modifiers!.add, result.add, result.remove);
    apply(group.modifiers!.remove, result.remove, result.add);
    return result;
}

function wrapInModifiers(source: string, { add, remove }: LocalizableModifiers): string {
    if (source === '') return '';
    const removed = remove.size > 0 ? `-${[...remove].join('')}` : '';
    return `(?${[...add].join('')}${removed}:${source})`;
}

// The source of a group-like node up to its first alternative, such as "(?<name>" or "(?<=".
function groupPrefix(node: GroupLikeNode): string {
    return node.raw.slice(0, node.alternatives[0]!.start - node.start);
}

// The source of a quantified element after the element itself, such as "+?".
function quantifierSuffix(element: AST.Element): string {
    return element.type === 'Quantifier' ? element.raw.slice(element.element.end - element.start) : '';
}

// The alternatives with the modifiers moved into each of them, so no disjunction is left inside a modifier group that
// has a character class after its first alternative.
function pushModifiersIntoAlternatives(alternatives: readonly AST.Alternative[], modifiers: LocalizableModifiers): string {
    return alternatives.map(alternative => {
        let result = '';
        let run = '';
        for (const element of alternative.elements) {
            if (!needsSplit(element)) {
                run += element.raw;
                continue;
            }

            result += wrapInModifiers(run, modifiers);
            run = '';

            const base = baseElement(element) as GroupLikeNode;
            const inner = base.type === 'Group' && base.modifiers !== null
                ? `(?:${pushModifiersIntoAlternatives(base.alternatives, modifiersOf(base, modifiers))})`
                : `${groupPrefix(base)}${pushModifiersIntoAlternatives(base.alternatives, modifiers)})`;
            result += inner + quantifierSuffix(element);
        }

        return result + wrapInModifiers(run, modifiers);
    }).join('|');
}

// Whether a case modifier group in the alternatives, at any depth, has a misread alternation.
function hasMisreadModifierGroup(alternatives: readonly AST.Alternative[]): boolean {
    return alternatives.some(alternative => alternative.elements.some(element => {
        const base = baseElement(element);
        if (!isGroupLike(base)) return false;
        if (isCaseModifierGroup(base) && hasMisreadAlternation(base.alternatives)) return true;
        return hasMisreadModifierGroup(base.alternatives);
    }));
}

function fixAlternatives(alternatives: readonly AST.Alternative[]): string {
    return alternatives.map(alternative => alternative.elements.map(fixElement).join('')).join('|');
}

function fixElement(element: AST.Element): string {
    const base = baseElement(element);
    if (!isGroupLike(base)) return element.raw;

    const misread = isCaseModifierGroup(base) && hasMisreadAlternation(base.alternatives);
    if (!misread && !hasMisreadModifierGroup(base.alternatives)) return element.raw;

    const fixed = misread
        ? `(?:${pushModifiersIntoAlternatives(base.alternatives, modifiersOf(base))})`
        : `${groupPrefix(base)}${fixAlternatives(base.alternatives)})`;
    return fixed + quantifierSuffix(element);
}

// Rewrites case modifier groups with misread alternations, such as (?i:a|[b]) into (?:(?i:a)|(?i:[b])), splitting the
// group around any inner disjunction: (?i:x(?:a|[b])) becomes (?:(?i:x)(?:(?i:a)|(?i:[b]))).
export function modifierGroupAlternativesPatternTransformer(source: string, flags: string): string {
    if (flags.includes('u') || flags.includes('v')) return source;
    const ast = parseRegexSource(source, scanOptionsFromFlags(flags));
    if (ast === null || !hasMisreadModifierGroup(ast.alternatives)) return source;
    return fixAlternatives(ast.alternatives);
}

// With the u or v flag, a case modifier group's modifier leaks into the character classes, property escapes and
// \w-style escapes after it, until the next group is opened: /^(?i:a)[B]$/v matches "ab". Opening an empty group right
// after the modifier group stops it, so one is inserted wherever something other than a group follows.
export function modifierGroupLeaksPatternTransformer(source: string, flags: string): string {
    if (!flags.includes('u') && !flags.includes('v')) return source;
    const ast = parseRegexSource(source, scanOptionsFromFlags(flags));
    if (ast === null) return source;

    const positions: number[] = [];
    const visit = (alternatives: readonly AST.Alternative[]) => {
        for (const alternative of alternatives) {
            alternative.elements.forEach((element, index) => {
                const base = baseElement(element);
                if (!isGroupLike(base)) return;
                visit(base.alternatives);
                if (!isCaseModifierGroup(base) || element.end === source.length) return;

                const next = alternative.elements[index + 1];
                if (next !== undefined && isGroupLike(baseElement(next))) return;
                positions.push(element.end);
            });
        }
    };
    visit(ast.alternatives);

    for (const position of positions.sort((a, b) => b - a)) {
        source = `${source.slice(0, position)}(?:)${source.slice(position)}`;
    }
    return source;
}
