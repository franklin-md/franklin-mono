import type { AnyMessage } from '@agentclientprotocol/sdk';
import type { MultiplexedPacket, Stream } from '@franklin/transport';
import {
	createMultiplexedEventStream,
	streamToEventInterface,
} from '@franklin/transport';

import { createIpcStream } from './stream.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A message routed to/from a specific agent over IPC.
 *   - id:   the agentId (which subprocess this message belongs to)
 *   - data: the ACP JSON-RPC message payload
 */
type AgentMessage = MultiplexedPacket<AnyMessage>;

declare global {
	interface Window {
		agent: {
			spawn: (name: string) => Promise<string>;
			kill: (agentId: string) => Promise<void>;
		};
	}
}

// ---------------------------------------------------------------------------
// Two-level demux: ipc-stream → "agent-transport" → agentId
// ---------------------------------------------------------------------------

// Level 1: demux the shared IPC channel to the "agent-transport" stream.
// Carries all agents' messages as AgentMessage packets.
const agentChannel: Stream<AgentMessage> =
	createIpcStream<AgentMessage>('agent-transport');

// Convert to EventInterface for level 2 demuxing by agentId.
const agentMux = streamToEventInterface(agentChannel);

// ---------------------------------------------------------------------------
// Spawn
// ---------------------------------------------------------------------------

/**
 * Spawns an agent subprocess via main and returns an AgentTransport.
 *
 * 1. Calls main via preload to spawn the process (main owns the agentId).
 * 2. Creates the renderer-side demuxed transport for that agentId.
 * 3. Wraps dispose to kill the agent in main.
 *
 * The returned transport is a valid AgentTransport — pass it directly
 * to createAgentConnection() or spawnFromTransport().
 * Calling transport.close() kills the subprocess.
 */
export async function spawn(name: string): Promise<Stream<AnyMessage>> {
	const agentId = await window.agent.spawn(name);
	const inner = createMultiplexedEventStream<AnyMessage>(agentId, agentMux);

	return {
		WriteT: inner.WriteT,
		writable: inner.writable,
		close: async () => {
			await inner.close();
			await window.agent.kill(agentId);
		},
	};
}
