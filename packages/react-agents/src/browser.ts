/**
 * Browser-safe entrypoint for @franklin/react-agents.
 *
 * Re-exports everything except spawn.ts, which pulls Node-only deps
 * (StdioTransport via @franklin/agent). Safe to import from Electron
 * renderer or any browser environment.
 */

export {
	AgentManager,
	ManagedSession,
	type AgentManagerOptions,
	type AgentStatus,
	type CreateConnection,
} from './agent-manager.js';
export { useAgentManager, useSessionSnapshot, useTranscript } from './hooks.js';
export {
	createSessionStore,
	type AgentSessionSnapshot,
	type AgentSessionStore,
	type ReactAgentSession,
	type TranscriptEntry,
} from './session-store.js';
