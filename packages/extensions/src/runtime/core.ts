import type { CtxTracker, MiniACPClient } from '@franklin/mini-acp';
import type { RuntimeBase } from './types.js';
import type { CoreState } from '../state/core.js';

export type CoreRuntime = RuntimeBase<CoreState> &
	Pick<MiniACPClient, 'initialize' | 'setContext' | 'prompt' | 'cancel'> & {
		subscribe(listener: () => void): () => void;
	};

export function createCoreRuntime(
	client: MiniACPClient,
	tracker: CtxTracker,
	transport: { dispose(): Promise<void> },
): CoreRuntime {
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
		setContext: client.setContext.bind(client),
		prompt: client.prompt.bind(client),
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
		subscribe(listener: () => void): () => void {
			tracker.onChange = listener;
			return () => {
				if (tracker.onChange === listener) tracker.onChange = undefined;
			};
		},
	};
}
