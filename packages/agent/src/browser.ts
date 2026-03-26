/**
 * Browser-safe entrypoint for @franklin/agent.
 *
 * Keep this limited to renderer-safe APIs consumed across the repo.
 */

export { SessionManager } from './agent/session/index.js';
export { AuthManager } from './auth/manager.js';
export type {
	AuthFile,
	ApiKeyEntry,
	OAuthLoginCallbacks,
} from './auth/types.js';
export type { Session } from './agent/session/types.js';
export type { Agent, AgentCommands } from './types.js';

export {
	type FranklinApp,
	type FranklinExtensionApi,
	type FranklinExtension,
} from './app/types.js';

export { createApp } from './app/create.js';

export { type Platform } from './platform.js';
