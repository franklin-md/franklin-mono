import type {
	Ctx,
	CtxTracker,
	LLMConfig,
	MiniACPClient,
	UsageTracker,
} from '@franklin/mini-acp';
import { ZERO_USAGE } from '@franklin/mini-acp';
import { createObserver } from '@franklin/lib';
import type { BaseRuntime } from '../../algebra/runtime/index.js';
import type { CoreState } from './state.js';

async function* notifyAfter<T>(
	stream: AsyncIterable<T>,
	notify: () => void,
): AsyncIterable<T> {
	try {
		yield* stream;
	} finally {
		notify();
	}
}

export type CoreRuntime = BaseRuntime<CoreState> &
	Pick<MiniACPClient, 'prompt' | 'cancel'> & {
		setLLMConfig(config: Partial<LLMConfig>): Promise<void>;
		/**
		 * Full last-sent context snapshot (systemPrompt, messages, tools,
		 * config). Distinct from `state()`, which is the persistable shape
		 * and deliberately omits the compiled system prompt and tools —
		 * those are recomputed by handlers on fork. `context()` is the
		 * debug/inspection view of what the agent actually saw last.
		 */
		context(): Ctx;
	};

export function assembleRuntime(
	client: MiniACPClient,
	tracker: CtxTracker,
	usageTracker: UsageTracker,
	transport: { dispose(): Promise<void> },
): CoreRuntime {
	const observer = createObserver();

	function snapshotLLMConfig(): CoreState['core']['llmConfig'] {
		const cfg = tracker.get().config;
		return {
			model: cfg.model,
			provider: cfg.provider,
			reasoning: cfg.reasoning,
		};
	}

	return {
		async setLLMConfig(config) {
			await client.setContext({ config });
			observer.notify();
		},

		// Notify after prompt completes (turn end), not per-chunk.
		// Originally wired to tracker.onChange which fired per-chunk on every
		// append. Moved to turn-end because persisting incomplete responses
		// mid-stream isn't useful — they can't be resumed.
		prompt(message) {
			return notifyAfter(client.prompt(message), () => observer.notify());
		},

		cancel: client.cancel.bind(client),

		context(): Ctx {
			return tracker.get();
		},

		async state(): Promise<CoreState> {
			const ctx = tracker.get();
			return {
				core: {
					messages: [...ctx.history.messages],
					llmConfig: snapshotLLMConfig(),
					usage: usageTracker.get(),
				},
			};
		},
		async fork(): Promise<CoreState> {
			const ctx = tracker.get();
			return {
				core: {
					messages: [...ctx.history.messages],
					llmConfig: snapshotLLMConfig(),
					usage: usageTracker.get(),
				},
			};
		},
		async child(): Promise<CoreState> {
			return {
				core: {
					messages: [],
					llmConfig: snapshotLLMConfig(),
					usage: ZERO_USAGE,
				},
			};
		},
		async dispose(): Promise<void> {
			await transport.dispose();
		},
		subscribe: (listener: () => void) => observer.subscribe(listener),
	};
}
