import type { AnyMessage } from '@agentclientprotocol/sdk';
import {
	type MultiplexedEventInterface,
	type MultiplexedPacket,
	type Stream,
	connect,
	createMultiplexedEventStream,
	streamToEventInterface,
} from '@franklin/transport';
import {
	type AgentRegistry,
	StdioTransport,
	createDefaultRegistry,
} from '@franklin/agent';
import type { WebContents } from 'electron/main';
import { ipcMain } from 'electron/main';
import { randomUUID } from 'node:crypto';

import { createMainIpcStream } from './stream.js';

/**
 * Bridges renderer ↔ agent subprocesses.
 *
 * The renderer sends ACP JSON-RPC messages over IPC, multiplexed by agentId.
 * The relay demuxes each agent's stream and connects it bidirectionally to
 * the agent's StdioTransport. Main is just a pipe — all middleware and
 * connection logic lives in the renderer.
 */
export class AgentRelay {
	private agents = new Map<
		string,
		{ stdio: StdioTransport; bridge: Stream<AnyMessage> }
	>();
	private agentMux: MultiplexedEventInterface<AnyMessage>;
	private registry: AgentRegistry;

	constructor(webContents: WebContents) {
		this.registry = createDefaultRegistry();

		// Level 1: demux the raw IPC channel to get the shared agent stream
		const agentChannel = createMainIpcStream<MultiplexedPacket<AnyMessage>>(
			'agent-transport',
			webContents,
		);

		// Convert to EventInterface for level 2 demuxing by agentId
		this.agentMux = streamToEventInterface(agentChannel);

		// Handle spawn/kill requests from renderer
		ipcMain.handle('agent:spawn', (_event, name: string) => this.spawn(name));
		ipcMain.handle('agent:kill', (_event, agentId: string) =>
			this.kill(agentId),
		);
	}

	/**
	 * Resolves an agent name via the registry, spawns the subprocess,
	 * and bridges it to the IPC channel.
	 * Returns the agentId — main owns ID generation.
	 */
	spawn(name: string): string {
		const spec = this.registry.get(name);
		const agentId = randomUUID();
		const stdio = new StdioTransport(spec);

		// Level 2: per-agent slice of the shared IPC stream
		const ipcStream = createMultiplexedEventStream<AnyMessage>(
			agentId,
			this.agentMux,
		);

		// Bidirectionally connect IPC ↔ stdio. That's it.
		const bridge = connect(ipcStream, stdio);

		this.agents.set(agentId, { stdio, bridge });
		return agentId;
	}

	/**
	 * Kills an agent and cleans up its streams.
	 */
	async kill(agentId: string): Promise<void> {
		const entry = this.agents.get(agentId);
		if (!entry) return;
		this.agents.delete(agentId);
		await entry.bridge.close();
	}

	/**
	 * Kills all agents. Call on window close.
	 */
	async dispose(): Promise<void> {
		const kills = [...this.agents.keys()].map((id) => this.kill(id));
		await Promise.allSettled(kills);
		ipcMain.removeHandler('agent:spawn');
		ipcMain.removeHandler('agent:kill');
	}
}
