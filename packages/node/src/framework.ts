import type { McpTransportFactory } from '@franklin/agent';

import type { ProvisionOptions } from './environment.js';
import type { NodeEnvironment } from './environment.js';
import { provision } from './environment.js';
import type { AgentRegistry } from './registry.js';
import { createToolTransport } from './tool-transport.js';

// ---------------------------------------------------------------------------
// FrameworkOptions
// ---------------------------------------------------------------------------

export interface FrameworkOptions {
	toolTransport?: McpTransportFactory;
}

// ---------------------------------------------------------------------------
// NodeFramework — informal Framework for Node.js
// ---------------------------------------------------------------------------

/**
 * Manages agent environments in a Node.js process.
 *
 * Wraps the existing `provision()` helper and adds lifecycle tracking
 * so that `dispose()` can tear down all provisioned environments.
 * Environments are keyed by their auto-generated ID for lookup.
 *
 * This is an informal framework — not yet formalized in `@franklin/agent`.
 * Once Electron and other frameworks prove the shape, we can extract an
 * abstract interface.
 */
export class NodeFramework {
	private readonly environments = new Map<string, NodeEnvironment>();

	constructor(
		private readonly registry: AgentRegistry,
		private readonly options?: FrameworkOptions,
	) {}

	/** MCP transport factory — defaults to the Node HTTP relay. */
	get toolTransport(): McpTransportFactory {
		return this.options?.toolTransport ?? createToolTransport;
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
