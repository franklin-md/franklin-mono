import type {
	MiniACPClient,
	ToolDefinition as SerializedToolDefinition,
} from '@franklin/mini-acp';
import type { CoreState } from '../state.js';

type BootRuntimeInput = {
	readonly client: MiniACPClient;
	readonly state: CoreState;
	readonly tools: readonly SerializedToolDefinition[];
};

export async function bootRuntime({
	client,
	state,
	tools,
}: BootRuntimeInput): Promise<void> {
	await client.initialize();

	const core = state.core;
	await client.setContext({
		history: { systemPrompt: '', messages: [...core.messages] },
		tools: [...tools],
		config: { ...core.llmConfig },
	});
}
