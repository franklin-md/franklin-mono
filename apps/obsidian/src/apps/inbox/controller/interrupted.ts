import type { FailedState } from '../types.js';

export function interruptedState(): FailedState {
	return {
		kind: 'failed',
		error: 'Interrupted when Obsidian closed. Retry to continue.',
	};
}
