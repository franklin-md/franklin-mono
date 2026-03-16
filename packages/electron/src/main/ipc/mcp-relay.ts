import type {
	ToolCallRequest,
	ToolCallResponse,
	SerializedToolDefinition,
	McpServerConfig,
} from '@franklin/local-mcp';
import { createRelayConfig } from '@franklin/local-mcp';
import {
	type MultiplexedPacket,
	bridge,
	connect,
	createMultiplexedEventStream,
	streamToEventInterface,
	HttpJsonServer,
	PortManager,
} from '@franklin/transport';
import type { WebContents } from 'electron';
import { ipcMain } from 'electron';

import { MCP_STREAM, MCP_START, MCP_STOP } from '../../shared/channels.js';
import { createMainIpcStream } from './stream.js';

// Shared port manager for all MCP relays in this process.
const portManager = new PortManager();

interface McpRelayEntry {
	server: HttpJsonServer;
	port: number;
	dispose: () => Promise<void>;
}

/**
 * Relays MCP tool calls between HTTP servers (main) and tool handlers (renderer).
 *
 * For each MCP session:
 * 1. Allocates a port and starts an HTTP server in main
 * 2. Creates a bridge that correlates HTTP requests with IPC responses
 * 3. Connects the bridge to a Level 2 IPC stream (demuxed by mcpId)
 * 4. Returns the McpServerConfig (relay spawn config) to the renderer
 *
 * Tool calls flow: Agent subprocess → HTTP POST → bridge → IPC → renderer
 * Responses flow:  renderer → IPC → bridge → HTTP response → agent subprocess
 */
export class McpRelay {
	private relays = new Map<string, McpRelayEntry>();
	private mcpMux;

	constructor(webContents: WebContents) {
		// Level 1: demux the raw IPC channel to get the shared MCP stream
		const mcpChannel = createMainIpcStream<
			MultiplexedPacket<ToolCallRequest | ToolCallResponse>
		>(MCP_STREAM, webContents);

		// Convert to EventInterface for level 2 demuxing by mcpId
		this.mcpMux = streamToEventInterface(mcpChannel);

		// Handle MCP lifecycle requests from renderer
		ipcMain.handle(
			MCP_START,
			(_event, mcpId: string, tools: SerializedToolDefinition[]) =>
				this.start(mcpId, tools),
		);
		ipcMain.handle(MCP_STOP, (_event, mcpId: string) => this.stop(mcpId));
	}

	/**
	 * Starts an MCP relay for the given tools.
	 * Returns the McpServerConfig that agents use to connect.
	 */
	async start(
		mcpId: string,
		tools: SerializedToolDefinition[],
	): Promise<McpServerConfig> {
		const port = await portManager.allocate();

		try {
			const server = new HttpJsonServer({ port });

			// Bridge correlates HTTP POST requests with IPC responses
			const { handler, duplex: bridgeDuplex } = bridge<
				ToolCallRequest['body'],
				unknown
			>();

			// HTTP POST → enqueue to bridge readable
			server.onRequest((body) => handler(body as ToolCallRequest['body']));

			// Level 2: per-mcpId IPC stream
			const mcpIpcStream = createMultiplexedEventStream<
				ToolCallRequest | ToolCallResponse
			>(mcpId, this.mcpMux);

			// Connect bridge ↔ IPC stream
			// Requests flow main→renderer, responses flow renderer→main
			connect(bridgeDuplex, mcpIpcStream);

			await server.start();

			const config = createRelayConfig({
				callbackUrl: server.url,
				tools,
			});

			const entry: McpRelayEntry = {
				server,
				port,
				dispose: async () => {
					await server.stop();
					await mcpIpcStream.close();
					portManager.release(port);
				},
			};

			this.relays.set(mcpId, entry);
			return config;
		} catch (error) {
			portManager.release(port);
			throw error;
		}
	}

	/**
	 * Stops an MCP relay by mcpId.
	 */
	async stop(mcpId: string): Promise<void> {
		const entry = this.relays.get(mcpId);
		if (!entry) return;
		this.relays.delete(mcpId);
		await entry.dispose();
	}

	/**
	 * Stops all relays and removes IPC handlers. Call on window close.
	 */
	async disposeAll(): Promise<void> {
		const stops = [...this.relays.keys()].map((id) => this.stop(id));
		await Promise.allSettled(stops);

		ipcMain.removeHandler(MCP_START);
		ipcMain.removeHandler(MCP_STOP);
	}
}
