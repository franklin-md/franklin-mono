import type { Reference } from './types.js';

export function referenceKey(reference: Reference): string {
	const selector = reference.selector ?? '';
	const selectorTag = reference.selector === undefined ? 'u' : 's';
	// Length prefixes keep this unambiguous when locators or selectors contain `|`.
	return `l${reference.locator.length}:${reference.locator}|${selectorTag}${selector.length}:${selector}`;
}
