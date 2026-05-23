import type { LLMConfig, Message, Usage } from '@franklin/mini-acp';
import type { StateHandle } from '@franklin/extensibility';
import { ZERO_USAGE } from '@franklin/mini-acp';

export type ToolFilter = {
	disabled: string[];
};

export type SessionSnapshot = {
	messages: Message[];
	llmConfig: Omit<LLMConfig, 'apiKey'>;
	usage: Usage;
	toolFilter: ToolFilter;
};

export type CoreState = {
	core: SessionSnapshot;
};

type SessionRuntime = {
	getSession(): SessionSnapshot;
};

export function emptySessionSnapshot(): SessionSnapshot {
	return {
		messages: [],
		llmConfig: {},
		usage: ZERO_USAGE,
		toolFilter: emptyToolFilter(),
	};
}

export function emptyCoreState(): CoreState {
	return { core: emptySessionSnapshot() };
}

export function emptyToolFilter(): ToolFilter {
	return { disabled: [] };
}

export function copyToolFilter(filter: ToolFilter): ToolFilter {
	return { disabled: [...filter.disabled] };
}

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
