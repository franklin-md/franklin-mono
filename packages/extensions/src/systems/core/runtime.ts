import type { CtxTracker, MiniACPClient } from '@franklin/mini-acp';
import { createObserver } from '@franklin/lib';
import type { RuntimeBase } from '../../algebra/runtime/index.js';
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

export type CoreRuntime = RuntimeBase<CoreState> &
	Pick<MiniACPClient, 'initialize' | 'setContext' | 'prompt' | 'cancel'>;

export function createCoreRuntime(
	client: MiniACPClient,
	tracker: CtxTracker,
	transport: { dispose(): Promise<void> },
): CoreRuntime {
	const observer = createObserver();

	function snapshotLLMConfig(): CoreState['core']['llmConfig'] {
		const cfg = tracker.get().config;
		if (!cfg) return {};
		return {
			model: cfg.model,
			provider: cfg.provider,
			reasoning: cfg.reasoning,
		};
	}

	return {
		initialize: client.initialize.bind(client),

		// Notify after setContext completes — config/history may have changed.
		async setContext(ctx) {
			await client.setContext(ctx);
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

		async state(): Promise<CoreState> {
			const ctx = tracker.get();
			return {
				core: {
					history: {
						systemPrompt: ctx.history.systemPrompt,
						messages: [...ctx.history.messages],
					},
					llmConfig: snapshotLLMConfig(),
				},
			};
		},
		async fork(): Promise<CoreState> {
			const ctx = tracker.get();
			return {
				core: {
					history: {
						systemPrompt: ctx.history.systemPrompt,
						messages: [...ctx.history.messages],
					},
					llmConfig: snapshotLLMConfig(),
				},
			};
		},
		async child(): Promise<CoreState> {
			return {
				core: {
					history: { systemPrompt: '', messages: [] },
					llmConfig: snapshotLLMConfig(),
				},
			};
		},
		async dispose(): Promise<void> {
			await transport.dispose();
		},
		subscribe: (listener: () => void) => observer.subscribe(listener),
	};
}
