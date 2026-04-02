import type { Action } from '../types.js';

export function initialize(): Action {
	return { type: 'initialize' };
}
