import type { DelayDescriptor } from './types.js';

export function delay(ms: number): DelayDescriptor {
	return { type: 'delay', ms };
}
