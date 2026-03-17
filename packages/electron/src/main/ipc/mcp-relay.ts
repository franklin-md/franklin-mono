import type {
	ToolCallRequest,
	ToolCallResponse,
	SerializedToolDefinition,
	McpServerConfig,
	McpTransport,
} from '@franklin/local-mcp';
import { type MuxPacket, Multiplexer, connect } from '@franklin/transport';
import type { WebContents } from 'electron';
import { ipcMain } from 'electron';

import { MCP_STREAM, MCP_START, MCP_STOP } from '../../shared/channels.js';
import { createMainIpcMux } from './stream.js';
import type { NodeFramework } from '@franklin/node';

/**
 * Relays MCP tool calls between HTTP servers (main) and tool handlers (renderer).
 */
export class McpRelay {
	private transports = new Map<string, McpTransport>();
	private mcpMux: Multiplexer<ToolCallResponse, ToolCallRequest>;

	constructor(
		webContents: WebContents,
		private readonly framework: NodeFramework,
	) {
		// Level 0: demux the raw IPC channel
		// Main reads responses from renderer, writes requests to renderer
		const ipcMux = createMainIpcMux<
			MuxPacket<ToolCallResponse>,
			MuxPacket<ToolCallRequest>
		>(webContents);

		// Level 1: MCP transport channel -> Level 2 multiplexer by mcpId
		this.mcpMux = new Multiplexer(ipcMux.channel(MCP_STREAM));

		// Handle MCP lifecycle requests from renderer
		ipcMain.handle(
			MCP_START,
			(
				_event,
				mcpId: string,
				name: string,
				tools: SerializedToolDefinition[],
			) => this.start(mcpId, name, tools),
		);
		ipcMain.handle(MCP_STOP, (_event, mcpId: string) => this.stop(mcpId));
	}

	/**
	 * Starts an MCP relay for the given tools.
	 * Returns the McpServerConfig that agents use to connect.
	 */
	async start(
		mcpId: string,
		name: string,
		tools: SerializedToolDefinition[],
	): Promise<McpServerConfig> {
		const transport = await this.framework.toolTransport(name, tools);
		this.transports.set(mcpId, transport);
		// Level 2: per-mcpId IPC stream
		const mcpIpcStream = this.mcpMux.channel(mcpId);

		// Connect bridge <-> IPC stream
		// Requests flow main->renderer, responses flow renderer->main
		connect(transport.stream, mcpIpcStream);

		return transport.config;
	}

	/**
	 * Stops an MCP relay by mcpId.
	 */
	async stop(mcpId: string): Promise<void> {
		const entry = this.transports.get(mcpId);
		if (!entry) return;
		this.transports.delete(mcpId);
		await entry.dispose();
	}

	/**
	 * Stops all relays and removes IPC handlers. Call on window close.
	 */
	async disposeAll(): Promise<void> {
		const stops = [...this.transports.keys()].map((id) => this.stop(id));
		await Promise.allSettled(stops);

		ipcMain.removeHandler(MCP_START);
		ipcMain.removeHandler(MCP_STOP);
	}
}
