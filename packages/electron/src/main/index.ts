import type { AuthStore } from '@franklin/auth';
import type { NodeFramework } from '@franklin/node';
import type { WebContents } from 'electron';

import { AgentRelay } from './ipc/agent-relay.js';
import { AuthRelay } from './ipc/auth-relay.js';

// ---------------------------------------------------------------------------
// MainHandle — returned by initializeMain for lifecycle management
// ---------------------------------------------------------------------------

export interface MainHandle {
	dispose(): Promise<void>;
}

// ---------------------------------------------------------------------------
// initializeMain — wire IPC relays for a BrowserWindow
// ---------------------------------------------------------------------------

/**
 * Initializes the main-process side of `@franklin/electron` for a window.
 *
 * @param webContents - The window's webContents to send/receive IPC messages.
 * @param framework - A NodeFramework instance for provisioning environments.
 * @param authStore - Optional AuthStore; when provided, enables the auth IPC
 *   bridge so the renderer can use `<AuthProvider>` / `<AuthButton>`.
 */
export function initializeMain(
	webContents: WebContents,
	framework: NodeFramework,
	authStore?: AuthStore,
): MainHandle {
	const agentRelay = new AgentRelay(webContents, framework);
	const authRelay = authStore ? new AuthRelay(webContents, authStore) : null;

	return {
		dispose: async () => {
			await agentRelay.dispose();
			authRelay?.dispose();
		},
	};
}

export type { AgentRelay } from './ipc/agent-relay.js';
export type { AuthRelay } from './ipc/auth-relay.js';
