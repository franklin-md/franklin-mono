import type { CtxTracker, MiniACPClient } from '@franklin/mini-acp';
import type { CoreState } from '../../state/core.js';

/**
 * Seed a CtxTracker with the initial core state so it starts
 * with the correct history and config from the outset.
 */
export function seedTracker(
	tracker: CtxTracker,
	core: CoreState['core'],
): void {
	tracker.apply({
		history: {
			systemPrompt: core.history.systemPrompt,
			messages: [...core.history.messages],
		},
		tools: [],
		config: { ...core.llmConfig },
	});
}

/**
 * Initialize the raw client connection with the core state.
 * This sends the state directly to the agent process, bypassing
 * any middleware or tracker interception.
 */
export async function initializeRawClient(
	rawClient: MiniACPClient,
	core: CoreState['core'],
): Promise<void> {
	await rawClient.initialize({});
	await rawClient.setContext({
		ctx: {
			history: {
				systemPrompt: core.history.systemPrompt,
				messages: [...core.history.messages],
			},
			tools: [],
			config: { ...core.llmConfig },
		},
	});
}
