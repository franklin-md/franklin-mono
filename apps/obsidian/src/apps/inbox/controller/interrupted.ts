import type { FailedQuestion } from '../types.js';

export function interruptedState(): FailedQuestion {
	return {
		kind: 'failed',
		error: 'Interrupted when Obsidian closed. Retry to continue.',
	};
}
