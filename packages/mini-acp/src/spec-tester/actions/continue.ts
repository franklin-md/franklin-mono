import type { Action } from '../types.js';

export function continueTurn(): Action {
	return { type: 'continue' };
}
