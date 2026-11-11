import type {
	MCPServerConfig,
	ToolInvocation,
	ToolSourceTool,
} from '@franklin/agent';
import type { JsonObject, NetworkPermissions } from '@franklin/lib';
import {
	Client,
	StreamableHTTPClientTransport,
	type Tool,
} from '@modelcontextprotocol/client';
import type { MCPConnectionOptions } from './types.js';
import { authenticatedFetch } from './http.js';
import { compileSchema } from './validate.js';
import { mcpToolName } from './names.js';
import { connectionErrorMessage, MCPConnectionError } from './errors.js';
import { renderMCPOutput, toolOutput } from './result.js';

export class MCPConnection {
	private readonly lifetime = new AbortController();
	private readonly secrets = new Set<string>();
	private readonly client = new Client(
		{ name: 'Franklin', version: '0.0.0' },
		{
			capabilities: {},
			listMaxPages: 8,
			inputRequired: { autoFulfill: false },
		},
	);
	private readonly transport: StreamableHTTPClientTransport;
	private disposed = false;
	private tools: Tool[] = [];
	dirty = true;

	constructor(
		readonly config: MCPServerConfig,
		options: MCPConnectionOptions,
		getPermissions: () => Promise<NetworkPermissions>,
		private readonly assertCurrent: () => void,
	) {
		this.transport = new StreamableHTTPClientTransport(new URL(config.url), {
			fetch: authenticatedFetch(
				config,
				options,
				getPermissions,
				this.secrets,
				this.lifetime.signal,
			),
			requestInit: { redirect: 'manual', credentials: 'omit' },
			onInsufficientScope: 'throw',
			reconnectionOptions: {
				maxRetries: 0,
				maxReconnectionDelay: 1000,
				initialReconnectionDelay: 1000,
				reconnectionDelayGrowFactor: 1,
			},
		});
		this.client.onerror = () => {
			this.dirty = true;
		};
		this.client.onclose = () => {
			this.dirty = true;
		};
		this.client.setNotificationHandler(
			'notifications/tools/list_changed',
			() => {
				this.dirty = true;
			},
		);
	}

	async discover(signal: AbortSignal): Promise<void> {
		const combined = AbortSignal.any([
			signal,
			this.lifetime.signal,
			AbortSignal.timeout(15_000),
		]);
		if (!this.client.getServerVersion())
			await this.client.connect(this.transport, {
				signal: combined,
				timeout: 15_000,
			});
		const { tools } = await this.client.listTools(
			{},
			{ signal: combined, timeout: 15_000, cacheMode: 'bypass' },
		);
		if (
			tools.length > 100 ||
			new Set(tools.map((t) => t.name)).size !== tools.length
		)
			throw new MCPConnectionError(
				'MCP tool catalog is too large or contains duplicate names.',
			);
		const catalog = JSON.stringify(tools);
		for (const secret of this.secrets)
			if (
				secret.length >= 8 &&
				catalog.includes(JSON.stringify(secret).slice(1, -1))
			)
				throw new MCPConnectionError(
					'Server tool catalog contains credential data.',
				);
		this.tools = tools;
		this.dirty = false;
	}

	catalog(): Array<{ name: string; description: string }> {
		return this.tools.map((tool) => ({
			name: tool.name,
			description: tool.description ?? '',
		}));
	}

	descriptors(allowed: (name: string) => boolean): ToolSourceTool[] {
		return this.tools
			.filter(
				(tool) =>
					this.config.enabledTools.includes(tool.name) && allowed(tool.name),
			)
			.map((tool) => {
				const validate = compileSchema(tool.inputSchema as JsonObject);
				const validateOutput = tool.outputSchema
					? compileSchema(tool.outputSchema as JsonObject)
					: undefined;
				return {
					definition: {
						name: mcpToolName(this.config.id, tool.name),
						description: `${this.config.name}: ${tool.description ?? tool.name}`,
						inputSchema: tool.inputSchema as JsonObject,
					},
					execute: async (args, invocation) => {
						try {
							this.assertCurrent();
							if (this.disposed)
								throw new MCPConnectionError(
									'Connection changed or closed. Retry on the next turn.',
								);
							validate(args);
							return await this.call(tool, args, invocation, validateOutput);
						} catch (error) {
							if (!(error instanceof MCPConnectionError)) this.dirty = true;
							return toolOutput(
								this.config.id,
								tool.name,
								{
									content: [
										{ type: 'text', text: connectionErrorMessage(error) },
									],
									isError: true,
								},
								this.secrets,
							);
						}
					},
					render: renderMCPOutput,
				};
			});
	}

	private async call(
		tool: Tool,
		args: JsonObject,
		invocation: ToolInvocation,
		validateOutput?: (value: unknown) => void,
	) {
		const signal = AbortSignal.any([invocation.signal, this.lifetime.signal]);
		signal.throwIfAborted();
		const result = await this.client.callTool(
			{ name: tool.name, arguments: args },
			{ signal, timeout: 120_000, toolDefinition: tool },
		);
		if (!result.isError && validateOutput)
			validateOutput(result.structuredContent);
		return toolOutput(this.config.id, tool.name, result, this.secrets);
	}

	abort(): void {
		this.lifetime.abort();
		void this.dispose().catch(() => {});
	}
	async dispose(): Promise<void> {
		if (this.disposed) return;
		this.disposed = true;
		let timer: ReturnType<typeof setTimeout> | undefined;
		try {
			if (!this.lifetime.signal.aborted)
				await Promise.race([
					this.transport.terminateSession(),
					new Promise<void>((resolve) => {
						timer = setTimeout(resolve, 1000);
					}),
				]).catch(() => {});
		} finally {
			clearTimeout(timer);
			this.lifetime.abort();
			await this.client.close().catch(() => {});
		}
	}
}
