import type { IpcMain, WebContents } from 'electron';
import {
	connect,
	createCallbackServerPipe,
	createHttpCallbackServer,
} from '@franklin/transport';
import type { Connection, HttpCallbackServer } from '@franklin/transport';
import { createRelayConfig } from '@franklin/local-mcp';
import type {
	McpServerConfig,
	SerializedToolDefinition,
} from '@franklin/local-mcp';

import { createMainIpcStream } from './ipc/stream.js';

interface McpRelayEntry {
	connection: Connection;
	callbackServer: HttpCallbackServer;
	disposeIpc: () => void;
	disposePipe: () => void;
}

/**
 * Relays MCP tool-call traffic between the renderer (via IPC) and an
 * HTTP callback server (reached by MCP relay subprocesses).
 *
 * Mirrors {@link AgentRelay}: the main process is a dumb pipe.
 * All tool-call dispatch logic lives in the renderer.
 *
 *   Renderer ←─ IPC ─→ CallbackServerPipe ←─ HTTP ─→ MCP relay subprocess
 */
export class McpRelay {
	private readonly relays = new Map<string, McpRelayEntry>();
	private nextId = 0;

	constructor(
		private readonly webContents: WebContents,
		private readonly ipcMain: IpcMain,
	) {}

	/**
	 * Start an MCP callback server and connect it to the renderer via IPC.
	 *
	 * @param serializedTools Tool definitions (JSON Schema) forwarded to the
	 *   relay subprocess so it can advertise them over MCP stdio.
	 * @returns The McpServerConfig the agent should use to spawn the relay,
	 *   plus the mcpId used to route IPC data.
	 */
	async create(
		serializedTools: SerializedToolDefinition[],
	): Promise<{ config: McpServerConfig; mcpId: string }> {
		const mcpId = `mcp-${this.nextId++}`;

		const callbackServer = await createHttpCallbackServer();

		// Wrap the HTTP callback server as a Pipe (NDJSON request/response)
		const { pipe: httpPipe, dispose: disposePipe } =
			createCallbackServerPipe(callbackServer);

		// Create an IPC pipe using the same channel as agent data
		const { pipe: ipcPipe, dispose: disposeIpc } = createMainIpcStream({
			streamName: mcpId,
			webContents: this.webContents,
			ipcMain: this.ipcMain,
		});

		// Connect: HTTP callback server ↔ renderer IPC
		const connection = connect(httpPipe, ipcPipe);

		// Build the McpServerConfig that tells the agent how to spawn the relay
		const config: McpServerConfig = createRelayConfig({
			callbackUrl: callbackServer.url,
			tools: serializedTools,
		});

		this.relays.set(mcpId, {
			connection,
			callbackServer,
			disposeIpc,
			disposePipe,
		});

		return { config, mcpId };
	}

	async dispose(mcpId: string): Promise<void> {
		const entry = this.relays.get(mcpId);
		if (!entry) return;
		this.relays.delete(mcpId);

		await entry.connection.dispose();
		entry.disposePipe();
		entry.disposeIpc();
		await entry.callbackServer.dispose();
	}

	async disposeAll(): Promise<void> {
		await Promise.all([...this.relays.keys()].map((id) => this.dispose(id)));
	}
}
