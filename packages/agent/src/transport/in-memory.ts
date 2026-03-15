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
		pipes.streamA.writable,
		pipes.streamA.readable,
	);
	const agentStream = ndJsonStream(
		pipes.streamB.writable,
		pipes.streamB.readable,
	);

	const transport: AgentTransport = {
		stream: clientStream,
		async dispose() {
			await pipes.close();
		},
	};

	return { transport, agentStream };
}
