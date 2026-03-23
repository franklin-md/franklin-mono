import { getModel } from '@mariozechner/pi-ai';
import type { Model } from '@mariozechner/pi-ai';
import type { StreamFn } from '@mariozechner/pi-agent-core';
import { createDuplexPair } from '@franklin/transport';
import {
	createPiFactory,
	createSessionAdapter,
	createAgentConnection,
	type ClientProtocol,
	type AgentProtocol,
	type AgentConnection,
} from '@franklin/mini-acp';

// ---------------------------------------------------------------------------
// Default model — OpenRouter with z-ai/glm-5
// ---------------------------------------------------------------------------

function defaultModel(): Model<string> {
	return getModel('openrouter', 'z-ai/glm-5');
}

// ---------------------------------------------------------------------------
// NodeFramework
// ---------------------------------------------------------------------------

export interface SpawnOptions {
	model?: Model<string>;
	streamFn?: StreamFn;
}

/**
 * Spawns in-process Pi agents connected via MiniACP protocol.
 *
 * Each `spawn()` call creates a new agent backed by pi-agent-core,
 * wired up with bidirectional JSONRPC bindings. Returns the client-side
 * protocol transport for the caller to bind.
 */
export class NodeFramework {
	spawn(options?: SpawnOptions): ClientProtocol {
		const model = options?.model ?? defaultModel();
		const factory = createPiFactory({ model, streamFn: options?.streamFn });

		// TODO: Type this correctly, it is already correct but message type is painful
		const { a, b } = createDuplexPair();
		const clientDuplex = a as unknown as ClientProtocol;
		const agentDuplex = b as unknown as AgentProtocol;

		// Build handlers first, then pass to createAgentConnection.
		// getClient() is only called on first prompt, so agentBinding is
		// always set before it's accessed.
		// eslint-disable-next-line prefer-const -- assigned after handlers, used in handler closures
		let agentBinding!: AgentConnection;

		const handlers = createSessionAdapter(factory, () => agentBinding.remote);

		agentBinding = createAgentConnection(agentDuplex, handlers);

		return clientDuplex;
	}
}
