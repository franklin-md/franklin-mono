import type { Stream } from '@agentclientprotocol/sdk';
import { ndJsonStream } from '@agentclientprotocol/sdk';
import { createMemoryPipes } from '@franklin/transport';

import type { Transport } from './index.js';

/**
 * Creates an in-memory transport pair using shared memory pipes.
 * Returns a Transport (for the client side) and an agentStream (for the agent side).
 */
export function createMemoryTransport(): {
	transport: Transport;
	agentStream: Stream;
} {
	const pipes = createMemoryPipes();

	const clientStream = ndJsonStream(pipes.pipeA.writable, pipes.pipeA.readable);
	const agentStream = ndJsonStream(pipes.pipeB.writable, pipes.pipeB.readable);

	const transport: Transport = {
		stream: clientStream,
		async dispose() {
			await pipes.dispose();
		},
	};

	return { transport, agentStream };
}
