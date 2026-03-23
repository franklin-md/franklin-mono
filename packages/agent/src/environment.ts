// ---------------------------------------------------------------------------
// AgentSpec — what to spawn (for subprocess-based agents)
// ---------------------------------------------------------------------------

/**
 * Specification for spawning an agent process.
 * Framework implementations interpret this to create the appropriate transport.
 */
export interface AgentSpec {
	command: string;
	args?: string[];
}
