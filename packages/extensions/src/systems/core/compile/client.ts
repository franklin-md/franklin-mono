import type {
	MiniACPClient,
	ToolDefinition as SerializedToolDefinition,
} from '@franklin/mini-acp';
import type { CoreState } from '../state.js';
import { bootRuntime } from './boot.js';
import type { SpawnResult } from './compiler.js';
import { connect } from './decorators/connect.js';
import type { ProtocolDecorator } from './decorators/types.js';

export type AgentClient = MiniACPClient & { dispose(): Promise<void> };

type CreateAgentClientInput = {
	readonly transport: SpawnResult;
	readonly decorator: ProtocolDecorator;
	readonly state: CoreState;
	readonly tools: readonly SerializedToolDefinition[];
};

/**
 * Wire a transport through a decorator stack and bootstrap the
 * agent session (initialize + setContext with the persisted history,
 * tools, and config). Returns a ready-to-use MiniACP client.
 *
 * Intentionally ignorant of trackers, state handles, and the
 * `CoreRuntime` wrapper — this is the pure "MiniACP session" layer.
 */
export async function createAgentClient({
	transport,
	decorator,
	state,
	tools,
}: CreateAgentClientInput): Promise<AgentClient> {
	const client = await connect({ decorator, transport });
	await bootRuntime({ client, state, tools });
	return client;
}
