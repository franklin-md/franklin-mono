import {
	ZERO_USAGE,
	type LLMConfig,
	type Message,
	type Usage,
} from '@franklin/mini-acp';
import { ContextTracker, UsageTracker } from '@franklin/mini-acp/session';
import type { StateHandle } from '@franklin/extensibility';
import type { SessionSnapshot } from '../state.js';

type LLMConfigSnapshot = SessionSnapshot['llmConfig'];

export type CoreResources = {
	readonly tracker: ContextTracker;
	readonly usageTracker: UsageTracker;
	readonly stateHandle: StateHandle<SessionSnapshot>;
};

export function createResources(session: SessionSnapshot): CoreResources {
	const tracker = new ContextTracker();
	tracker.apply({
		systemPrompt: '',
		messages: [...session.messages],
		tools: [],
		config: { ...session.llmConfig },
	});

	const usageTracker = new UsageTracker();
	usageTracker.add(session.usage);

	return {
		tracker,
		usageTracker,
		stateHandle: createStateHandle(tracker, usageTracker),
	};
}

/**
 * Build a `StateHandle<SessionSnapshot>` from the runtime's live trackers.
 *
 * `get` snapshots the current message history, config, and accumulated
 * usage. `fork` inherits messages and config but resets usage — a fork
 * is a sibling session that tracks its own spend from zero. `child`
 * returns a fresh blank state that inherits the caller's llmConfig.
 */
export function createStateHandle(
	tracker: ContextTracker,
	usageTracker: UsageTracker,
): StateHandle<SessionSnapshot> {
	return {
		get: async () => {
			const context = tracker.get();
			return sessionSnapshot(
				context.messages,
				pickLLMConfig(context.config),
				usageTracker.get(),
			);
		},
		fork: async () => {
			const context = tracker.get();
			return sessionSnapshot(
				context.messages,
				pickLLMConfig(context.config),
				ZERO_USAGE,
			);
		},
		child: async () =>
			sessionSnapshot([], pickLLMConfig(tracker.get().config), ZERO_USAGE),
	};
}

function pickLLMConfig(cfg: LLMConfig): LLMConfigSnapshot {
	return {
		model: cfg.model,
		provider: cfg.provider,
		reasoning: cfg.reasoning,
	};
}

function sessionSnapshot(
	messages: readonly Message[],
	llmConfig: LLMConfigSnapshot,
	usage: Usage,
): SessionSnapshot {
	return {
		messages: [...messages],
		llmConfig,
		usage: snapshotUsage(usage),
	};
}

function snapshotUsage(usage: Usage): Usage {
	return {
		tokens: { ...usage.tokens },
		cost: { ...usage.cost },
	};
}
