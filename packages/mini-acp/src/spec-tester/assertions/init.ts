import type { Transcript } from '../types.js';
import { match } from './match.js';

/** Index of the first receive:initialize — marks when init is "complete". */
export function initCompletedIndex(t: Transcript): number {
	return t.findIndex((e) => match(e, 'receive', 'initialize'));
}
