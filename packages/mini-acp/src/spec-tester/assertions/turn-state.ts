import type { Transcript } from '../types.js';
import { match } from './match.js';

/** True if the transcript is inside an active turn at the given index. */
export function isTurnActiveAt(t: Transcript, idx: number): boolean {
	let active = false;
	for (let i = 0; i <= idx; i++) {
		const e = t[i];
		if (!e) continue;
		if (match(e, 'receive', 'turnStart')) active = true;
		if (match(e, 'receive', 'turnEnd')) active = false;
	}
	return active;
}

export function nextReceiveAfter(
	t: Transcript,
	idx: number,
): Extract<Transcript[number], { direction: 'receive' }> | undefined {
	for (let i = idx + 1; i < t.length; i++) {
		const entry = t[i];
		if (entry?.direction === 'receive') {
			return entry;
		}
	}
	return undefined;
}

export function promptStartsTurn(t: Transcript, idx: number): boolean {
	return nextReceiveAfter(t, idx)?.method === 'turnStart';
}

export function promptIsRejected(t: Transcript, idx: number): boolean {
	const next = nextReceiveAfter(t, idx);
	return next?.method === 'error' && next.params.operation === 'prompt';
}

/**
 * Returns turn slices: each slice starts at a send:prompt that actually
 * starts a turn (i.e. its next receive is turnStart) and ends at the
 * corresponding receive:turnEnd.
 */
export function turns(t: Transcript): Transcript[] {
	const result: Transcript[] = [];
	let start = -1;
	for (let i = 0; i < t.length; i++) {
		const e = t[i];
		if (!e) continue;
		if (match(e, 'send', 'prompt') && promptStartsTurn(t, i) && start === -1) {
			start = i;
		}
		if (match(e, 'receive', 'turnEnd') && start !== -1) {
			result.push(t.slice(start, i + 1));
			start = -1;
		}
	}
	// Unclosed turn (prompt sent but no turnEnd yet)
	if (start !== -1) result.push(t.slice(start));
	return result;
}
