import type { LLMConfig, Usage } from '@franklin/mini-acp';
import { ZERO_USAGE } from '@franklin/mini-acp';
import type { SessionEntry } from './history/types.js';

export type ToolFilter = {
	disabled: string[];
};

export type SessionSnapshot = {
	entries: SessionEntry[];
	llmConfig: Omit<LLMConfig, 'apiKey'>;
	usage: Usage;
	toolFilter: ToolFilter;
};

export type CoreState = {
	core: SessionSnapshot;
};

export function emptySessionSnapshot(): SessionSnapshot {
	return {
		entries: [],
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
