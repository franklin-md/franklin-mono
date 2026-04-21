import {
	CtxTracker,
	UsageTracker,
	ZERO_USAGE,
	type LLMConfig,
	type Message,
	type Usage,
} from '@franklin/mini-acp';
import type { StateHandle } from '../../../algebra/runtime/index.js';
import type { CoreState } from '../state.js';

type LLMConfigSnapshot = CoreState['core']['llmConfig'];

export type CoreResources = {
	readonly tracker: CtxTracker;
	readonly usageTracker: UsageTracker;
	readonly stateHandle: StateHandle<CoreState>;
};

export function createResources(state: CoreState): CoreResources {
	const tracker = new CtxTracker();
	tracker.apply({
		history: { systemPrompt: '', messages: [...state.core.messages] },
		tools: [],
		config: { ...state.core.llmConfig },
	});

	const usageTracker = new UsageTracker();
	usageTracker.add(state.core.usage);

	return {
		tracker,
		usageTracker,
		stateHandle: createStateHandle(tracker, usageTracker),
	};
}

/**
 * Build a `StateHandle<CoreState>` from the runtime's live trackers.
 *
 * `get` snapshots the current message history, config, and accumulated
 * usage. `fork` inherits messages and config but resets usage — a fork
 * is a sibling session that tracks its own spend from zero. `child`
 * returns a fresh blank state that inherits the caller's llmConfig.
 */
export function createStateHandle(
	tracker: CtxTracker,
	usageTracker: UsageTracker,
): StateHandle<CoreState> {
	return {
		get: async () => {
			const ctx = tracker.get();
			return coreState(
				ctx.history.messages,
				pickLLMConfig(ctx.config),
				usageTracker.get(),
			);
		},
		fork: async () => {
			const ctx = tracker.get();
			return coreState(
				ctx.history.messages,
				pickLLMConfig(ctx.config),
				ZERO_USAGE,
			);
		},
		child: async () =>
			coreState([], pickLLMConfig(tracker.get().config), ZERO_USAGE),
	};
}

function pickLLMConfig(cfg: LLMConfig): LLMConfigSnapshot {
	return {
		model: cfg.model,
		provider: cfg.provider,
		reasoning: cfg.reasoning,
	};
}

function coreState(
	messages: readonly Message[],
	llmConfig: LLMConfigSnapshot,
	usage: Usage,
): CoreState {
	return {
		core: {
			messages: [...messages],
			llmConfig,
			usage: snapshotUsage(usage),
		},
	};
}

function snapshotUsage(usage: Usage): Usage {
	return {
		tokens: {
			input: usage.tokens.input,
			output: usage.tokens.output,
			cacheRead: usage.tokens.cacheRead,
			cacheWrite: usage.tokens.cacheWrite,
			total: usage.tokens.total,
		},
		cost: {
			input: usage.cost.input,
			output: usage.cost.output,
			cacheRead: usage.cost.cacheRead,
			cacheWrite: usage.cost.cacheWrite,
			total: usage.cost.total,
		},
	};
}
