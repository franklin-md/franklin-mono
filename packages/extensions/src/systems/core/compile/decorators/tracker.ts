import { type CtxTracker, trackAgent, trackClient } from '@franklin/mini-acp';
import type { ProtocolDecorator } from '../decorator.js';
import type { CoreState } from '../../state.js';

export function createTrackerDecorator(
	state: CoreState,
	tracker: CtxTracker,
): ProtocolDecorator {
	return {
		name: 'tracker',
		async server(s) {
			return trackAgent(tracker, s);
		},
		async client(c) {
			// TODO: I wonder if its possible to move this out of the decorator?
			// I..e something that is in an initial boot up sequence Prior to the decorators?
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
	};
}
