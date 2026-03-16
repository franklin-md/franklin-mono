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
import type { NodeEnvironment, ProvisionOptions } from '@franklin/node';
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
 * The renderer sends ACP JSON-RPC messages over IPC, multiplexed by agentId.
 * The relay demuxes each agent's stream and connects it bidirectionally to
 * the agent's StdioTransport. Main is just a pipe — all middleware and
 * connection logic lives in the renderer.
 */
export class AgentRelay {
	private agents = new Map<
		string,
		{ stdio: StdioTransport; bridge: Duplex<AnyMessage> }
	>();
	private environments = new Map<string, NodeEnvironment>();
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

		// Handle environment lifecycle requests from renderer
		ipcMain.handle(ENV_PROVISION, (_event, opts?: ProvisionOptions) =>
			this.provisionEnv(opts),
		);
		ipcMain.handle(ENV_DISPOSE, (_event, envId: string) =>
			this.disposeEnv(envId),
		);

		// Handle agent lifecycle requests from renderer
		ipcMain.handle(AGENT_SPAWN, (_event, envId: string, name: string) =>
			this.spawn(envId, name),
		);
		ipcMain.handle(AGENT_KILL, (_event, agentId: string) => this.kill(agentId));
	}

	/**
	 * Provisions a new environment via the NodeFramework.
	 * Returns an envId — main owns ID generation.
	 */
	provisionEnv(opts?: ProvisionOptions): string {
		const envId = randomUUID();
		const env = this.framework.provision(opts);
		this.environments.set(envId, env);
		return envId;
	}

	/**
	 * Disposes an environment and removes it from the map.
	 */
	async disposeEnv(envId: string): Promise<void> {
		const env = this.environments.get(envId);
		if (!env) return;
		this.environments.delete(envId);
		await env.dispose();
	}

	/**
	 * Spawns an agent subprocess in a provisioned environment
	 * and bridges it to the IPC channel.
	 * Returns the agentId — main owns ID generation.
	 */
	async spawn(envId: string, name: string): Promise<string> {
		const env = this.environments.get(envId);
		if (!env) throw new Error(`Unknown environment: "${envId}"`);

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
	 * Disposes all agents and environments. Call on window close.
	 */
	async dispose(): Promise<void> {
		// Kill all agents
		const agentKills = [...this.agents.keys()].map((id) => this.kill(id));
		await Promise.allSettled(agentKills);

		// Dispose all environments
		const envDisposals = [...this.environments.keys()].map((id) =>
			this.disposeEnv(id),
		);
		await Promise.allSettled(envDisposals);

		// Remove IPC handlers
		ipcMain.removeHandler(ENV_PROVISION);
		ipcMain.removeHandler(ENV_DISPOSE);
		ipcMain.removeHandler(AGENT_SPAWN);
		ipcMain.removeHandler(AGENT_KILL);
	}
}
