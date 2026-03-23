import type { NodeFramework } from '@franklin/node';
import type { WebContents } from 'electron';

import { AgentRelay } from './ipc/agent-relay.js';

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
 * Sets up IPC handlers for framework and agent relay communication
 * between the renderer and agent subprocesses. Returns a handle to dispose
 * all resources. MCP tool relay is no longer needed — extension tools
 * are handled in-channel.
 *
 * @param webContents - The window's webContents to send/receive IPC messages.
 * @param framework - A NodeFramework instance for provisioning environments.
 */
export function initializeMain(
	webContents: WebContents,
	framework: NodeFramework,
): MainHandle {
	const agentRelay = new AgentRelay(webContents, framework);

	return {
		dispose: async () => {
			await agentRelay.dispose();
		},
	};
}

export type { AgentRelay } from './ipc/agent-relay.js';
