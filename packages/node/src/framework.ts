import type { McpTransportFactory } from '@franklin/agent';

import type { NodeEnvironment, ProvisionOptions } from './environment.js';
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
 *
 * This is an informal framework — not yet formalized in `@franklin/agent`.
 * Once Electron and other frameworks prove the shape, we can extract an
 * abstract interface.
 */
export class NodeFramework {
	private readonly environments = new Set<NodeEnvironment>();

	constructor(
		private readonly registry: AgentRegistry,
		private readonly options?: FrameworkOptions,
	) {}

	/** MCP transport factory — defaults to the Node HTTP relay. */
	get toolTransport(): McpTransportFactory {
		return this.options?.toolTransport ?? createToolTransport;
	}

	/** Provision a new local environment. */
	provision(opts?: ProvisionOptions): NodeEnvironment {
		const env = provision(this.registry, opts);
		this.environments.add(env);
		return env;
	}

	/** Dispose all provisioned environments. */
	async dispose(): Promise<void> {
		const disposals = [...this.environments].map((env) => env.dispose());
		await Promise.allSettled(disposals);
		this.environments.clear();
	}
}
