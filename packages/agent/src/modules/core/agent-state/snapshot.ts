import { ZERO_USAGE } from '@franklin/mini-acp';
import type { SessionSnapshot } from '../state.js';

export function forkSessionSnapshot(
	snapshot: SessionSnapshot,
): SessionSnapshot {
	return {
		messages: [...snapshot.messages],
		llmConfig: { ...snapshot.llmConfig },
		usage: ZERO_USAGE,
	};
}

export function childSessionSnapshot(
	snapshot: SessionSnapshot,
): SessionSnapshot {
	return {
		messages: [],
		llmConfig: { ...snapshot.llmConfig },
		usage: ZERO_USAGE,
	};
}
