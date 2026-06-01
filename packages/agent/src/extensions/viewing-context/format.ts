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
	const parts = [`locator=${reference.locator}`];
	if (reference.selector !== undefined) {
		parts.push(`selector=${reference.selector}`);
	}
	if (reference.label !== undefined) {
		parts.push(`label=${reference.label}`);
	}
	return parts.join('; ');
}
