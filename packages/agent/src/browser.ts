/**
 * Browser-safe entrypoint for @franklin/agent.
 *
 * Keep this limited to renderer-safe APIs consumed across the repo.
 */

import type { Session as GenericSession } from './agent/session/types.js';
import type { FranklinRuntime as _RT } from './types.js';

export { SessionManager } from './agent/session/index.js';
export { SessionRegistry } from './agent/session/registry.js';
export { AuthManager } from './auth/manager.js';
export type {
	AuthFile,
	ApiKeyEntry,
	OAuthLoginCallbacks,
	IAuthManager,
	OAuthEntry,
	AuthChangeListener,
	AuthEntry,
} from './auth/types.js';
export type { FranklinState, FranklinRuntime, FranklinAPI } from './types.js';

/** Concrete session type for the Franklin app layer. */
export type Session = GenericSession<_RT>;

export {
	type FranklinApp,
	type FranklinExtensionApi,
	type FranklinExtension,
} from './app/types.js';

export { createApp, type AppOptions } from './app/create.js';

export { type Platform } from './platform.js';
