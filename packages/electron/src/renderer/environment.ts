import type { EnvironmentHandle } from '@franklin/agent/browser';
import type { Duplex } from '@franklin/transport';
import type { AnyMessage } from '@agentclientprotocol/sdk';

import { createIpcAgentTransport } from './ipc/agent-transport.js';

/**
 * Renderer-side EnvironmentHandle that proxies spawn/dispose over Electron IPC.
 *
 * Each instance maps to a NodeEnvironment provisioned in the main process,
 * identified by envId. Agent spawning and lifecycle are handled by the
 * main process AgentRelay; this class creates the renderer-side IPC transport.
 */
export class ElectronEnvironmentHandle implements EnvironmentHandle {
	constructor(private readonly envId: string) {}

	async spawn(name: string): Promise<Duplex<AnyMessage>> {
		const agentId = await window.__franklinBridge.agent.spawn(this.envId, name);
		return createIpcAgentTransport(agentId);
	}

	async dispose(): Promise<void> {
		await window.__franklinBridge.agent.disposeEnv(this.envId);
	}
}
