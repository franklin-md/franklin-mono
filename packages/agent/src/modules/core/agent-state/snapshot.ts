import { ZERO_USAGE } from '@franklin/mini-acp';
import {
	copyToolFilter,
	emptyToolFilter,
	type SessionSnapshot,
} from '../state.js';

export function forkSessionSnapshot(
	snapshot: SessionSnapshot,
): SessionSnapshot {
	return {
		messages: [...snapshot.messages],
		llmConfig: { ...snapshot.llmConfig },
		usage: ZERO_USAGE,
		toolFilter: copyToolFilter(snapshot.toolFilter),
	};
}

export function childSessionSnapshot(
	snapshot: SessionSnapshot,
): SessionSnapshot {
	return {
		messages: [],
		llmConfig: { ...snapshot.llmConfig },
		usage: ZERO_USAGE,
		// Forks preserve caller policy; child sessions usually reset runtime-local
		// affordances for a fresh task. If products need different inheritance,
		// make child policy configurable at session creation rather than persisted.
		toolFilter: emptyToolFilter(),
	};
}
