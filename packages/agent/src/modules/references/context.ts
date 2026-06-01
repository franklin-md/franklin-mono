import type { UserContent } from '@franklin/mini-acp';
import type { ReferenceContext } from './api/index.js';

export function referenceContextToContent(
	context: ReferenceContext,
): UserContent[] {
	return [context.content];
}

export function referenceContextsToContent(
	contexts: readonly ReferenceContext[],
): UserContent[] {
	return contexts.map((context) => context.content);
}
