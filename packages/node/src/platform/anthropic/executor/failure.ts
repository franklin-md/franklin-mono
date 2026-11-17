import type { CommandFailure } from './types.js';

export function failure(reason: unknown): CommandFailure {
	return { status: 'rejected', reason };
}
