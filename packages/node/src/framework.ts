import { getModel } from '@mariozechner/pi-ai';
import type { Model } from '@mariozechner/pi-ai';
import type { StreamFn } from '@mariozechner/pi-agent-core';
import { createDuplexPair } from '@franklin/transport';
import {
	createPiAdapter,
	createAgentConnection,
	createSessionAdapter,
	type ClientProtocol,
	type AgentProtocol,
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

		// TODO: Type this correctly, it is already correct but message type is painful
		const { a, b } = createDuplexPair();
		const clientDuplex = a as unknown as ClientProtocol;
		const agentDuplex = b as unknown as AgentProtocol;

		// Phase 1: get the remote proxy (toolExecute) without needing handlers yet
		const { remote, bind } = createAgentConnection(agentDuplex);

		// Build handlers that capture the proxy directly — no forward-declaration needed
		const handlers = createSessionAdapter((ctx) =>
			createPiAdapter({
				client: remote,
				model,
				ctx,
				streamFn: options?.streamFn,
			}),
		);

		// Phase 2: bind handlers and start dispatching
		bind(handlers);

		return clientDuplex;
	}
}
