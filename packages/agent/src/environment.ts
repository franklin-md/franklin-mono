import type { ClientProtocol } from '@franklin/mini-acp';

// ---------------------------------------------------------------------------
// ClientTransport — the protocol transport from the client's perspective
// ---------------------------------------------------------------------------

/** Transport for MiniACP communication. Pass to createClientConnection to bind. */
export type ClientTransport = ClientProtocol;

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
