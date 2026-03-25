/**
 * Browser-safe entrypoint for @franklin/agent.
 *
 * Keep this limited to renderer-safe APIs consumed across the repo.
 */

export { SessionManager } from './agent/session/index.js';
export type { Session } from './agent/session/types.js';
export type { Agent, AgentCommands } from './types.js';
