import type { AnyMessage } from '@agentclientprotocol/sdk';
import {
	type MultiplexedEventInterface,
	type MultiplexedPacket,
	type Duplex,
	connect,
	createMultiplexedEventStream,
	streamToEventInterface,
} from '@franklin/transport';
import type { StdioTransport } from '@franklin/agent';
import type { NodeFramework } from '@franklin/node';
import type { ProvisionOptions } from '@franklin/node';
import type { WebContents } from 'electron';
import { ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';

import {
	AGENT_STREAM,
	ENV_PROVISION,
	ENV_DISPOSE,
	AGENT_SPAWN,
	AGENT_KILL,
} from '../../shared/channels.js';
import { createMainIpcStream } from './stream.js';

/**
 * Bridges renderer ↔ agent subprocesses over Electron IPC.
 *
 * Environment lifecycle is delegated to NodeFramework.
 * This relay only manages the IPC ↔ stdio bridging for agents.
 */
export class AgentRelay {
	private agents = new Map<
		string,
		{ stdio: StdioTransport; bridge: Duplex<AnyMessage> }
	>();
	private agentMux: MultiplexedEventInterface<AnyMessage>;

	constructor(
		webContents: WebContents,
		private readonly framework: NodeFramework,
	) {
		// Level 1: demux the raw IPC channel to get the shared agent stream
		const agentChannel = createMainIpcStream<MultiplexedPacket<AnyMessage>>(
			AGENT_STREAM,
			webContents,
		);

		// Convert to EventInterface for level 2 demuxing by agentId
		this.agentMux = streamToEventInterface(agentChannel);

		// Environment lifecycle — delegated to framework
		ipcMain.handle(ENV_PROVISION, (_event, opts?: ProvisionOptions) => {
			const env = this.framework.provision(opts);
			return env.id;
		});
		ipcMain.handle(ENV_DISPOSE, (_event, envId: string) =>
			this.framework.disposeEnv(envId),
		);

		// Agent lifecycle
		ipcMain.handle(AGENT_SPAWN, (_event, envId: string, name: string) =>
			this.spawn(envId, name),
		);
		ipcMain.handle(AGENT_KILL, (_event, agentId: string) => this.kill(agentId));
	}

	/**
	 * Spawns an agent subprocess in a provisioned environment
	 * and bridges it to the IPC channel.
	 * Returns the agentId — main owns ID generation.
	 */
	async spawn(envId: string, name: string): Promise<string> {
		const env = this.framework.get(envId);

		const agentId = randomUUID();
		const transport = await env.spawn(name);
		const stdio = transport as StdioTransport;

		// Level 2: per-agent slice of the shared IPC stream
		const ipcStream = createMultiplexedEventStream<AnyMessage>(
			agentId,
			this.agentMux,
		);

		// Bidirectionally connect IPC ↔ stdio
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
	 * Disposes all agents. Call on window close.
	 * (Environment disposal is handled by NodeFramework.dispose)
	 */
	async dispose(): Promise<void> {
		const agentKills = [...this.agents.keys()].map((id) => this.kill(id));
		await Promise.allSettled(agentKills);

		ipcMain.removeHandler(ENV_PROVISION);
		ipcMain.removeHandler(ENV_DISPOSE);
		ipcMain.removeHandler(AGENT_SPAWN);
		ipcMain.removeHandler(AGENT_KILL);
	}
}
