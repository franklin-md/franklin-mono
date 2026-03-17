import type { McpTransportFactory } from '@franklin/agent';
import { Framework } from '@franklin/agent';

import type { ProvisionOptions } from './environment.js';
import type { NodeEnvironment } from './environment.js';
import { provision } from './environment.js';
import type { AgentRegistry } from './registry.js';
import { PortManager } from '@franklin/transport';
import { createHttpTransport } from '@franklin/local-mcp';

// ---------------------------------------------------------------------------
// FrameworkOptions
// ---------------------------------------------------------------------------

export interface FrameworkOptions {
	toolTransport?: McpTransportFactory;
}

// ---------------------------------------------------------------------------
// NodeFramework
// ---------------------------------------------------------------------------

/**
 * Manages agent environments in a Node.js process.
 *
 * Extends the base Framework class to inherit `compileExtensions` and
 * `compileAgent`. Provides the Node-specific `toolTransport` (HTTP relay)
 * and environment lifecycle (local filesystem).
 */
export class NodeFramework extends Framework {
	private readonly portManager;
	private readonly environments = new Map<string, NodeEnvironment>();

	constructor(private readonly registry: AgentRegistry) {
		super();
		this.portManager = new PortManager();
	}

	/** MCP transport factory — defaults to the Node HTTP relay. */
	get toolTransport(): McpTransportFactory {
		// Shared port manager for all tool transports in this process.

		/**
		 * McpTransportFactory for Node.js environments.
		 *
		 * Spins up an HTTP server on localhost with an auto-assigned port.
		 * The agent subprocess connects to it via the MCP relay config
		 * injected into the session's mcpServers.
		 */
		return async (name, tools) => {
			const port = await this.portManager.allocate();
			try {
				return await createHttpTransport({
					name,
					tools,
					serverOptions: { port },
				});
			} catch (error) {
				this.portManager.release(port);
				throw error;
			}
		};
	}

	/** Provision a new local environment. Returns the environment (which has an id). */
	provision(opts?: ProvisionOptions): NodeEnvironment {
		const env = provision(this.registry, opts);
		this.environments.set(env.id, env);
		return env;
	}

	/** Look up a provisioned environment by ID. Throws if not found. */
	get(envId: string): NodeEnvironment {
		const env = this.environments.get(envId);
		if (!env) throw new Error(`Unknown environment: "${envId}"`);
		return env;
	}

	/** Dispose a single environment by ID. */
	async disposeEnv(envId: string): Promise<void> {
		const env = this.environments.get(envId);
		if (!env) return;
		this.environments.delete(envId);
		await env.dispose();
	}

	/** Dispose all provisioned environments. */
	async dispose(): Promise<void> {
		const disposals = [...this.environments.values()].map((env) =>
			env.dispose(),
		);
		await Promise.allSettled(disposals);
		this.environments.clear();
	}
}
