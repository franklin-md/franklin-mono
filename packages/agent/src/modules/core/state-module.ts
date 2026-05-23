import type { MiniACPConnector } from '@franklin/mini-acp';
import type { StateHandle } from '@franklin/extensibility';
import { ZERO_USAGE } from '@franklin/mini-acp';
import type { StateExtensionModule } from '../state/index.js';
import type { CoreSignature } from './api/api.js';
import { createCoreModule } from './module.js';
import type { CoreRuntime } from './runtime/index.js';

import type { CoreState, SessionSnapshot } from './state.js';
import { copyToolFilter, emptyCoreState, emptyToolFilter } from './state.js';

export type CoreStateModule = StateExtensionModule<
	CoreState,
	CoreSignature,
	CoreRuntime
>;

export function createCoreStateModule(
	connectAgent: MiniACPConnector,
): CoreStateModule {
	return {
		emptyState: emptyCoreState,
		state: coreStateFromSession,
		instantiate: (state) => createCoreModule(connectAgent, state.core),
	};
}

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
