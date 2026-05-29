import type { Reference } from '../../modules/references/index.js';
import type { ViewedReference } from './types.js';

export function formatViewingContext(
	references: readonly ViewedReference[],
): string | undefined {
	if (references.length === 0) return undefined;

	return [
		'<viewing_context>',
		'The user is currently viewing these resources:',
		...references.map((reference) => `- ${formatViewedReference(reference)}`),
		'</viewing_context>',
	].join('\n');
}

function formatViewedReference(reference: ViewedReference): string {
	if ('path' in reference) {
		return `path: ${reference.path}`;
	}

	return `reference: ${formatReference(reference.reference)}`;
}

function formatReference(reference: Reference): string {
	const parts = [`locator=${reference.locator}`];
	if (reference.type !== undefined) {
		parts.unshift(`type=${reference.type}`);
	}
	if (reference.selector !== undefined) {
		parts.push(`selector=${reference.selector}`);
	}
	return parts.join('; ');
}
