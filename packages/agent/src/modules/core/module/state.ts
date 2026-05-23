import type { StateHandle } from '@franklin/extensibility';
import { ZERO_USAGE } from '@franklin/mini-acp';

import type { CoreState, SessionSnapshot } from '../state.js';
import { copyToolFilter, emptyToolFilter } from '../state.js';

type SessionRuntime = {
	getSession(): SessionSnapshot;
};

export function coreStateFromSession(
	runtime: SessionRuntime,
): StateHandle<CoreState> {
	return {
		get: async () => ({ core: runtime.getSession() }),
		fork: async () => ({
			core: fork(runtime.getSession()),
		}),
		child: async () => ({
			core: child(runtime.getSession()),
		}),
	};
}

function fork(snapshot: SessionSnapshot): SessionSnapshot {
	return {
		messages: [...snapshot.messages],
		llmConfig: { ...snapshot.llmConfig },
		usage: ZERO_USAGE,
		toolFilter: copyToolFilter(snapshot.toolFilter),
	};
}

function child(snapshot: SessionSnapshot): SessionSnapshot {
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
