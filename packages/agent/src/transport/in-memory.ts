import type { Stream } from '@agentclientprotocol/sdk';
import { ndJsonStream } from '@agentclientprotocol/sdk';

import type { Transport } from './index.js';

/**
 * Creates an in-memory transport pair using TransformStreams.
 * Returns a Transport (for the client side) and an agentStream (for the agent side).
 * No subprocess, no JSON serialization overhead — fast and deterministic.
 *
 * We keep references to the byte-level TransformStream writables so dispose()
 * can close them directly. The ndJsonStream writable is locked by the ACP
 * Connection class, but ndJsonStream only temporarily locks the byte-level
 * output on each write, so closing it between writes works.
 */
export function createMemoryTransport(): {
	transport: Transport;
	agentStream: Stream;
} {
	// Two byte-level pipes connecting client ↔ agent
	const clientToAgent = new TransformStream<Uint8Array>();
	const agentToClient = new TransformStream<Uint8Array>();

	// Client writes to clientToAgent, reads from agentToClient
	const clientStream = ndJsonStream(
		clientToAgent.writable,
		agentToClient.readable,
	);

	// Agent writes to agentToClient, reads from clientToAgent
	const agentStream = ndJsonStream(
		agentToClient.writable,
		clientToAgent.readable,
	);

	const transport: Transport = {
		stream: clientStream,
		async dispose() {
			// Close the byte-level writable ends to tear down both connections.
			// ndJsonStream only locks these temporarily per-write, so closing
			// them between writes is safe. This causes the readers on the other
			// side to see EOF, which closes both ACP connections.
			await clientToAgent.writable.close().catch(() => {});
			await agentToClient.writable.close().catch(() => {});
		},
	};

	return { transport, agentStream };
}
