import { ToolsManager, serializeTool } from '@franklin/local-mcp/browser';
import type {
	AnyToolDefinition,
	LocalMcpTransport,
	McpServerConfig,
} from '@franklin/local-mcp/browser';

/**
 * NDJSON protocol matching the callback server pipe:
 *
 *   → incoming (from main): {"id":"...","body":{"tool":"...","arguments":{...}}}
 *   ← outgoing (to main):   {"id":"...","result":{...}} or {"id":"...","error":"..."}
 */

interface CallbackRequest {
	id: string;
	body: { tool: string; arguments: unknown };
}

/**
 * A {@link LocalMcpTransport} that runs in an Electron renderer.
 *
 * - The HTTP callback server lives in the main process (managed by {@link McpRelay}).
 * - Tool calls arrive as NDJSON over the shared IPC data channel.
 * - Tool dispatch (Zod parsing + handler execution) happens here in the renderer.
 *
 * This mirrors the agent transport pattern:
 *   Agent relay: StdioPipe (main) ↔ IPC ↔ IpcTransport (renderer)
 *   MCP relay:   CallbackServerPipe (main) ↔ IPC ↔ IpcMcpTransport (renderer)
 */
export class IpcMcpTransport implements LocalMcpTransport {
	private mcpId: string | undefined;
	private unsubscribe: (() => void) | undefined;
	private _setDisposed: (() => void) | undefined;
	private manager: ToolsManager | undefined;

	async start(tools: AnyToolDefinition[]): Promise<McpServerConfig> {
		this.manager = new ToolsManager(tools);
		const serializedTools = tools.map(serializeTool);

		// Ask main process to start the HTTP callback server
		const { config, mcpId } =
			await window.franklinBridge.startMcp(serializedTools);
		this.mcpId = mcpId;

		// Subscribe to NDJSON tool-call requests relayed from main
		const encoder = new TextEncoder();
		const decoder = new TextDecoder();
		let lineBuffer = '';
		let disposed = false;
		const manager = this.manager;

		this._setDisposed = () => {
			disposed = true;
		};

		this.unsubscribe = window.franklinBridge.onData((id, chunk) => {
			if (id !== mcpId) return;

			lineBuffer += decoder.decode(chunk, { stream: true });

			let newlineIdx: number;
			while ((newlineIdx = lineBuffer.indexOf('\n')) !== -1) {
				const line = lineBuffer.slice(0, newlineIdx).trim();
				lineBuffer = lineBuffer.slice(newlineIdx + 1);

				if (!line) continue;

				try {
					const req = JSON.parse(line) as CallbackRequest;
					void handleRequest(req);
				} catch {
					// Malformed line — skip
				}
			}
		});

		async function handleRequest(req: CallbackRequest): Promise<void> {
			try {
				const result: unknown = await manager.dispatch(
					req.body.tool,
					req.body.arguments,
				);
				if (disposed) return;
				const response = JSON.stringify({ id: req.id, result }) + '\n';
				window.franklinBridge.send(mcpId, encoder.encode(response));
			} catch (err) {
				if (disposed) return;
				const error = err instanceof Error ? err.message : 'Unknown error';
				const response = JSON.stringify({ id: req.id, error }) + '\n';
				window.franklinBridge.send(mcpId, encoder.encode(response));
			}
		}

		return config as McpServerConfig;
	}

	async dispose(): Promise<void> {
		this._setDisposed?.();
		this._setDisposed = undefined;

		this.unsubscribe?.();
		this.unsubscribe = undefined;

		if (this.mcpId) {
			await window.franklinBridge.stopMcp(this.mcpId);
			this.mcpId = undefined;
		}

		this.manager = undefined;
	}
}
