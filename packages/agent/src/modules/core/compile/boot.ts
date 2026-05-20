import type { MiniACPClient, ToolDefinition } from '@franklin/mini-acp';
import type { SessionSnapshot } from '../state.js';

type BootRuntimeInput = {
	readonly client: MiniACPClient;
	readonly session: SessionSnapshot;
	readonly tools: readonly ToolDefinition[];
};

export async function bootRuntime({
	client,
	session,
	tools,
}: BootRuntimeInput): Promise<void> {
	await client.initialize();

	await client.setContext({
		history: { systemPrompt: '', messages: [...session.messages] },
		tools: [...tools],
		config: { ...session.llmConfig },
	});
}
