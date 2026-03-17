import type { McpTransportFactory } from '@franklin/agent/browser';
import { Framework } from '@franklin/agent/browser';

import { ElectronEnvironmentHandle } from './environment.js';
import { createIpcMcpTransport } from './ipc/mcp-transport.js';

// ---------------------------------------------------------------------------
// ProvisionOptions — matches the shape from @franklin/node
// ---------------------------------------------------------------------------

export interface ProvisionOptions {
	cwd?: string;
	env?: Record<string, string | undefined>;
}

// ---------------------------------------------------------------------------
// ElectronFramework
// ---------------------------------------------------------------------------

/**
 * Renderer-side framework that proxies environment provisioning and agent
 * spawning over Electron IPC to the main process.
 *
 * Extends the base Framework class to inherit `compileExtensions` and
 * `compileAgent`. Provides the Electron-specific `toolTransport` (IPC)
 * and environment lifecycle (provisioned via main process).
 */
export class ElectronFramework extends Framework {
	private readonly environments = new Set<string>();

	/** MCP transport factory — proxies tool calls over IPC. */
	get toolTransport(): McpTransportFactory {
		return createIpcMcpTransport;
	}

	/**
	 * Provision a new environment in the main process.
	 * Returns a renderer-side handle for spawning agents.
	 */
	async provision(opts?: ProvisionOptions): Promise<ElectronEnvironmentHandle> {
		const envId = await window.__franklinBridge.agent.provisionEnv(opts);
		this.environments.add(envId);
		return new ElectronEnvironmentHandle(envId);
	}

	/** Dispose all provisioned environments. */
	async dispose(): Promise<void> {
		await Promise.allSettled(
			[...this.environments].map((id) =>
				window.__franklinBridge.agent.disposeEnv(id),
			),
		);
		this.environments.clear();
	}
}
