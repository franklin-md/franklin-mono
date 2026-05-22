import type { MiniACPClient } from '@franklin/mini-acp';

type InitializeRuntimeInput = {
	readonly client: MiniACPClient;
};

export async function initializeRuntime({
	client,
}: InitializeRuntimeInput): Promise<void> {
	await client.initialize();
}
