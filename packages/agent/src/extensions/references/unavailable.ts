import type { ReferenceContext } from '../../modules/references/api/index.js';

export function referenceUnavailable(message: string): ReferenceContext {
	return {
		content: [
			{ type: 'text' as const, text: `Reference unavailable: ${message}` },
		],
	};
}
