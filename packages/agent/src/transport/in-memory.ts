import type { Stream } from '@agentclientprotocol/sdk';
import { ndJsonStream } from '@agentclientprotocol/sdk';
import { createDuplexPair } from '@franklin/transport';

import type { AgentTransport } from './index.js';

/**
 * Creates an in-memory transport pair using a duplex pair.
 * Returns a Transport (for the client side) and an agentStream (for the agent side).
 */
export function createMemoryTransport(): {
	transport: AgentTransport;
	agentStream: Stream;
} {
	const { a, b } = createDuplexPair<Uint8Array>();

	const clientStream = ndJsonStream(a.writable, a.readable);
	const agentStream = ndJsonStream(b.writable, b.readable);

	const transport: AgentTransport = {
		readable: clientStream.readable,
		writable: clientStream.writable,
		async close() {
			await a.close();
		},
	};

	return { transport, agentStream };
}
