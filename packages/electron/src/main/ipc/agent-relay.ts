import type { AnyMessage } from '@agentclientprotocol/sdk';
import {
	type MuxPacket,
	type Duplex,
	Multiplexer,
	connect,
} from '@franklin/transport';
import type { NodeFramework } from '@franklin/node';
import type { WebContents } from 'electron';
import { ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';

import { AGENT_STREAM, AGENT_SPAWN, AGENT_KILL } from '../../shared/channels.js';
import { createMainIpcMux } from './stream.js';

/**
 * Bridges renderer <-> agent subprocesses over Electron IPC.
 *
 * This relay only manages the IPC <-> stdio bridging for agents.
 * Environment lifecycle is handled separately by FrameworkRelay.
 */
export class AgentRelay {
	private agents = new Map<string, Duplex<AnyMessage>>();
	private agentMux: Multiplexer<AnyMessage>;

	constructor(
		webContents: WebContents,
		private readonly framework: NodeFramework,
	) {
		// Level 0: demux the raw IPC channel
		const ipcMux = createMainIpcMux<MuxPacket<AnyMessage>>(webContents);

		// Level 1: agent transport channel -> Level 2 multiplexer by agentId
		this.agentMux = new Multiplexer(ipcMux.channel(AGENT_STREAM));

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

		// Level 2: per-agent slice of the shared IPC stream
		const ipcStream = this.agentMux.channel(agentId);

		// Bidirectionally connect IPC <-> agent transport
		const agent = connect(ipcStream, transport);

		this.agents.set(agentId, agent);
		return agentId;
	}

	/**
	 * Kills an agent and cleans up its streams.
	 */
	async kill(agentId: string): Promise<void> {
		const agent = this.agents.get(agentId);
		if (!agent) return;
		this.agents.delete(agentId);
		await agent.close();
	}

	/**
	 * Disposes all agents. Call on window close.
	 * (Environment disposal is handled by NodeFramework.dispose)
	 */
	async dispose(): Promise<void> {
		const agentKills = [...this.agents.keys()].map((id) => this.kill(id));
		await Promise.allSettled(agentKills);

		ipcMain.removeHandler(AGENT_SPAWN);
		ipcMain.removeHandler(AGENT_KILL);
	}
}
