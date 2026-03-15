import type { Stream } from '@agentclientprotocol/sdk';
import { ndJsonStream } from '@agentclientprotocol/sdk';
import { createMemoryPipes } from '@franklin/transport';

import type { AgentTransport } from './index.js';

/**
 * Creates an in-memory transport pair using shared memory pipes.
 * Returns a Transport (for the client side) and an agentStream (for the agent side).
 */
export function createMemoryTransport(): {
	transport: AgentTransport;
	agentStream: Stream;
} {
	const pipes = createMemoryPipes();

	const clientStream = ndJsonStream(
		pipes.server.writable,
		pipes.server.readable,
	);
	const agentStream = ndJsonStream(
		pipes.client.writable,
		pipes.client.readable,
	);

	const transport: AgentTransport = {
		readable: clientStream.readable,
		writable: clientStream.writable,
		async close() {
			await pipes.close();
		},
	};

	return { transport, agentStream };
}
