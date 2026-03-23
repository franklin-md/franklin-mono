import type { ClientTransport } from '@franklin/agent/browser';

import { createIpcAgentTransport } from './ipc/agent-transport.js';

// ---------------------------------------------------------------------------
// ElectronFramework
// ---------------------------------------------------------------------------

/**
 * Renderer-side framework that proxies agent spawning over Electron IPC
 * to the main process.
 *
 * Each `spawn()` call asks the main process to create an in-process agent
 * and returns a renderer-side IPC transport connected to it.
 */
export class ElectronFramework {
	private readonly agents = new Set<string>();

	/**
	 * Spawn an agent in the main process.
	 * Returns a renderer-side transport for communicating with it.
	 */
	async spawn(): Promise<ClientTransport> {
		const agentId = await window.__franklinBridge.agent.spawn();
		this.agents.add(agentId);
		return createIpcAgentTransport(agentId);
	}

	async dispose(): Promise<void> {
		await Promise.allSettled(
			[...this.agents].map((id) => window.__franklinBridge.agent.kill(id)),
		);
		this.agents.clear();
	}
}
