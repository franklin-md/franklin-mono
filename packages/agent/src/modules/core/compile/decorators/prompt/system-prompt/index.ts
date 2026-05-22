import type { MiniACPClient } from '@franklin/mini-acp';
import type { AgentState } from '../../../../agent-state/index.js';

export function createSystemPromptSync(
	agentState: Pick<AgentState, 'systemPrompt'>,
): (client: MiniACPClient) => Promise<void> {
	return async (client) => {
		const result = await agentState.systemPrompt.build();
		if (!result.changed) return;

		await client.setContext({
			systemPrompt: result.systemPrompt,
		});
	};
}
