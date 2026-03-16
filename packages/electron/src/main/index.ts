import type { NodeFramework } from '@franklin/node';
import type { WebContents } from 'electron';

import { AgentRelay } from './ipc/agent-relay.js';
import { McpRelay } from './ipc/mcp-relay.js';

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
 * Sets up IPC handlers for agent and MCP relay communication between the
 * renderer and agent subprocesses. Returns a handle to dispose all resources.
 *
 * @param webContents - The window's webContents to send/receive IPC messages.
 * @param framework - A NodeFramework instance for provisioning environments.
 */
export function initializeMain(
	webContents: WebContents,
	framework: NodeFramework,
): MainHandle {
	const agentRelay = new AgentRelay(webContents, framework);
	const mcpRelay = new McpRelay(webContents);

	return {
		dispose: async () => {
			await agentRelay.dispose();
			await mcpRelay.disposeAll();
		},
	};
}

export type { AgentRelay } from './ipc/agent-relay.js';
export type { McpRelay } from './ipc/mcp-relay.js';
