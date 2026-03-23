import { Framework } from '@franklin/agent';

import type { ProvisionOptions } from './environment.js';
import type { NodeEnvironment } from './environment.js';
import { provision } from './environment.js';
import type { AgentRegistry } from './registry.js';

// ---------------------------------------------------------------------------
// NodeFramework
// ---------------------------------------------------------------------------

/**
 * Manages agent environments in a Node.js process.
 *
 * Extends the base Framework class. Provides environment lifecycle
 * (local filesystem). MCP tool relay is no longer needed — extension tools
 * are handled in-channel.
 */
export class NodeFramework extends Framework {
	private readonly environments = new Map<string, NodeEnvironment>();

	constructor(private readonly registry: AgentRegistry) {
		super();
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
