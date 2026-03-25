import { Multiplexer, connect, debugStream } from '@franklin/transport';
import type { WebContents } from 'electron';
import { ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';

import {
	AGENT_STREAM,
	AGENT_SPAWN,
	AGENT_KILL,
} from '../../shared/channels.js';
import { createMainIpcMux } from './stream.js';
import type {
	ServerMux,
	ServerReceiveMux,
	ServerSendMux,
} from '../../shared/types.js';
import type { AgentProtocol, ClientProtocol } from '@franklin/mini-acp';
import type { Platform } from '@franklin/agent';

/**
 * Bridges renderer <-> in-process agents over Electron IPC.
 *
 * Each spawn() creates an in-process Pi agent via NodeFramework and
 * bridges its protocol transport to the IPC channel.
 */
export class AgentRelay {
	private agents = new Map<string, ClientProtocol>();
	private agentMux: ServerMux;

	constructor(
		webContents: WebContents,
		private readonly platform: Platform,
	) {
		const ipcMux = createMainIpcMux<ServerReceiveMux, ServerSendMux>(
			webContents,
		);
		this.agentMux = new Multiplexer(ipcMux.channel(AGENT_STREAM));

		ipcMain.handle(AGENT_SPAWN, () => this.spawn());
		ipcMain.handle(AGENT_KILL, (_event, agentId: string) => this.kill(agentId));
	}

	/**
	 * Spawns an in-process agent and bridges it to the IPC channel.
	 * Returns the agentId.
	 */
	async spawn(): Promise<string> {
		const agentId = randomUUID();
		const transport: ClientProtocol = await this.platform.spawn();

		// Per-agent slice of the shared IPC stream
		const ipcStream: AgentProtocol = this.agentMux.channel(agentId);

		// Bidirectionally connect IPC <-> agent transport
		// Both sides carry JsonRpcMessage on the wire — cast through Duplex<unknown>
		const agent = connect(debugStream(transport, 'agent'), ipcStream);

		this.agents.set(agentId, agent);
		return agentId;
	}

	async kill(agentId: string): Promise<void> {
		const agent = this.agents.get(agentId);
		if (!agent) return;
		this.agents.delete(agentId);
		await agent.close();
	}

	async dispose(): Promise<void> {
		const agentKills = [...this.agents.keys()].map((id) => this.kill(id));
		await Promise.allSettled(agentKills);

		ipcMain.removeHandler(AGENT_SPAWN);
		ipcMain.removeHandler(AGENT_KILL);
	}
}
