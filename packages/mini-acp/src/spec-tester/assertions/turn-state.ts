import type { Transcript } from '../types.js';
import { match } from './match.js';

/** True if the transcript is inside an active turn at the given index. */
export function isTurnActiveAt(t: Transcript, idx: number): boolean {
	let active = false;
	for (let i = 0; i <= idx; i++) {
		const e = t[i];
		if (!e) continue;
		if (match(e, 'send', 'prompt')) active = true;
		if (match(e, 'receive', 'turnEnd')) active = false;
	}
	return active;
}

/**
 * Returns turn slices: each slice starts at a send:prompt and ends at
 * (and includes) the corresponding receive:turnEnd.
 */
export function turns(t: Transcript): Transcript[] {
	const result: Transcript[] = [];
	let start = -1;
	for (let i = 0; i < t.length; i++) {
		const e = t[i];
		if (!e) continue;
		if (match(e, 'send', 'prompt')) start = i;
		if (match(e, 'receive', 'turnEnd') && start !== -1) {
			result.push(t.slice(start, i + 1));
			start = -1;
		}
	}
	// Unclosed turn (prompt sent but no turnEnd yet)
	if (start !== -1) result.push(t.slice(start));
	return result;
}
