import type { Action } from '../types.js';

export function cancel(): Action {
	return { type: 'cancel' };
}
