import type { EnvironmentHandle, ClientTransport } from '@franklin/agent';
import { randomUUID } from 'node:crypto';

import type { AgentRegistry } from './registry.js';

// ---------------------------------------------------------------------------
// NodeEnvironment — EnvironmentHandle for Node.js
// ---------------------------------------------------------------------------

/**
 * An environment backed by the local filesystem.
 * Spawns agent subprocesses via child_process with stdio transport.
 */
export class NodeEnvironment implements EnvironmentHandle {
	readonly id: string;

	constructor(
		readonly cwd: string,
		private readonly env: Record<string, string>,
		private readonly registry: AgentRegistry,
	) {
		this.id = randomUUID();
	}

	async spawn(_agent: string): Promise<ClientTransport> {
		// TODO: Implement
		throw new Error('Not implemented');
	}

	async dispose(): Promise<void> {
		// Local environments don't need cleanup today.
		// Future: clean up worktrees, temp dirs, etc.
	}
}

// ---------------------------------------------------------------------------
// ProvisionOptions
// ---------------------------------------------------------------------------

export interface ProvisionOptions {
	cwd?: string;
	env?: Record<string, string | undefined>;
}

// ---------------------------------------------------------------------------
// provision — create a NodeEnvironment
// ---------------------------------------------------------------------------

/**
 * Provision a local Node.js environment.
 *
 * @param registry - Agent registry for resolving agent names to specs.
 * @param options - Override cwd and/or env vars.
 */
export function provision(
	registry: AgentRegistry,
	options?: ProvisionOptions,
): NodeEnvironment {
	// Start from process.env, filtering out undefined values.
	const base = Object.fromEntries(
		Object.entries(process.env).filter(
			(entry): entry is [string, string] => entry[1] !== undefined,
		),
	);

	// Apply overrides: defined values are set, undefined values are removed.
	if (options?.env) {
		for (const [key, value] of Object.entries(options.env)) {
			if (value !== undefined) {
				base[key] = value;
			} else {
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete base[key];
			}
		}
	}

	return new NodeEnvironment(options?.cwd ?? process.cwd(), base, registry);
}
