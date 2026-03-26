import type { IAuthManager } from '@franklin/auth';
import type { NodeFramework } from '@franklin/node';
import type { WebContents } from 'electron';

import { AppRelay } from './ipc/app-relay.js';
import { AgentRelay } from './ipc/agent-relay.js';
import { AuthRelay } from './ipc/auth-relay.js';
import { FilesystemRelay } from './ipc/filesystem-relay.js';

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
 * @param authManager - Optional auth manager; when provided, enables the auth
 *   IPC bridge so the renderer can use `<AuthProvider>` / `<AuthButton>`.
 */
export function initializeMain(
	webContents: WebContents,
	framework: NodeFramework,
	authManager?: IAuthManager,
): MainHandle {
	const appRelay = new AppRelay();
	const agentRelay = new AgentRelay(webContents, framework);
	const authRelay = authManager
		? new AuthRelay(webContents, authManager)
		: null;
	const filesystemRelay = new FilesystemRelay();

	return {
		dispose: async () => {
			appRelay.dispose();
			await agentRelay.dispose();
			authRelay?.dispose();
			filesystemRelay.dispose();
		},
	};
}

export type { AppRelay } from './ipc/app-relay.js';
export type { AgentRelay } from './ipc/agent-relay.js';
export type { AuthRelay } from './ipc/auth-relay.js';
export type { FilesystemRelay } from './ipc/filesystem-relay.js';
