import type { AgentTransport } from './transport/index.js';

// ---------------------------------------------------------------------------
// EnvironmentHandle — a handle to a provisioned environment
// ---------------------------------------------------------------------------

/**
 * A handle to a provisioned environment where agents execute.
 *
 * Today, an environment is a working directory on the user's OS.
 * In the future, it could be a Docker container, a cloud VM, or a git
 * worktree. Environments have their own lifecycle — they are provisioned
 * before agents are spawned and may outlive any single agent. Multiple
 * agents can share an environment.
 *
 * Framework packages (e.g., `@franklin/node`, `@franklin/electron`) provide
 * concrete implementations.
 */
export interface EnvironmentHandle {
	/**
	 * Start an agent in this environment by name (resolved via registry),
	 * returning a transport for ACP communication.
	 */
	spawn(agent: string): Promise<AgentTransport>;

	/** Clean up the environment and release resources. */
	dispose(): Promise<void>;
}

// ---------------------------------------------------------------------------
// AgentSpec — what to spawn
// ---------------------------------------------------------------------------

/**
 * Specification for spawning an agent process.
 * Framework implementations interpret this to create the appropriate transport.
 */
export interface AgentSpec {
	command: string;
	args?: string[];
}
