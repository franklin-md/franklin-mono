import { CtxTracker, trackAgent, trackClient } from '@franklin/mini-acp';
import type { ProtocolDecorator } from '../decorator.js';
import type { CoreState } from '../../../state/core.js';

export function createTrackerDecorator(state: CoreState): {
	decorator: ProtocolDecorator;
	tracker: CtxTracker;
} {
	const tracker = new CtxTracker();

	return {
		tracker,
		decorator: {
			name: 'tracker',
			async agent(a) {
				return trackAgent(tracker, a);
			},
			async client(c) {
				const core = state.core;

				// Seed tracker with initial state
				tracker.apply({
					history: {
						systemPrompt: core.history.systemPrompt,
						messages: [...core.history.messages],
					},
					tools: [],
					config: { ...core.llmConfig },
				});

				// Mirror initial state to server process
				await c.setContext({
					history: {
						systemPrompt: core.history.systemPrompt,
						messages: [...core.history.messages],
					},
					tools: [],
					config: { ...core.llmConfig },
				});

				return trackClient(tracker, c);
			},
		},
	};
}
