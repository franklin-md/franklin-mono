import { TurnEndError } from '../../../shared/agent/turn-end/error.js';
import type { FailedState } from '../types.js';
import { errorMessage } from './error.js';

export function failedState(error: unknown): FailedState {
	return {
		kind: 'failed',
		error: errorMessage(error),
		...(error instanceof TurnEndError ? { stopCode: error.stopCode } : {}),
	};
}
