import { ToolsManager, serializeTool } from '@franklin/local-mcp/browser';
import { createNdjsonDecoder, encodeNdjsonLine } from '@franklin/transport';
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
		const requestDecoder = createNdjsonDecoder<CallbackRequest>();
		let disposed = false;
		const manager = this.manager;

		this._setDisposed = () => {
			disposed = true;
		};

		this.unsubscribe = window.franklinBridge.onData((id, chunk) => {
			if (id !== mcpId) return;

			for (const req of requestDecoder.write(chunk)) {
				void handleRequest(req);
			}
		});

		async function handleRequest(req: CallbackRequest): Promise<void> {
			try {
				const result: unknown = await manager.dispatch(
					req.body.tool,
					req.body.arguments,
				);
				if (disposed) return;
				window.franklinBridge.send(
					mcpId,
					encodeNdjsonLine({ id: req.id, result }),
				);
			} catch (err) {
				if (disposed) return;
				const error = err instanceof Error ? err.message : 'Unknown error';
				window.franklinBridge.send(
					mcpId,
					encodeNdjsonLine({ id: req.id, error }),
				);
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
