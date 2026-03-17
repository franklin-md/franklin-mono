import type {
	LoadSessionRequest,
	LoadSessionResponse,
	McpServer,
	NewSessionRequest,
	NewSessionResponse,
	PromptRequest,
	PromptResponse,
	RequestPermissionRequest,
	RequestPermissionResponse,
	SessionNotification,
} from '@agentclientprotocol/sdk';

import type { McpTransport } from '@franklin/local-mcp';

import type { Middleware } from '../../middleware/types.js';
import { emptyMiddleware } from '../../middleware/empty.js';
import type { SessionStartHandler } from '../types/index.js';
import type { CollectedState } from './collect.js';

// ---------------------------------------------------------------------------
// runSessionStartWaterfall — shared by newSession and loadSession
// ---------------------------------------------------------------------------

async function runSessionStartWaterfall(
	sessionId: string | undefined,
	cwd: string,
	mcpServers: McpServer[],
	handlers: SessionStartHandler[],
	transport: McpTransport | undefined,
): Promise<{ cwd: string; mcpServers: McpServer[] }> {
	for (const handler of handlers) {
		const result = await handler({ sessionId, cwd, mcpServers });
		if (result) {
			if (result.cwd !== undefined) cwd = result.cwd;
			if (result.mcpServers !== undefined) mcpServers = result.mcpServers;
		}
	}

	if (transport) {
		mcpServers = [...mcpServers, transport.config as McpServer];
	}

	return { cwd, mcpServers };
}

// ---------------------------------------------------------------------------
// buildMiddleware — construct Middleware from collected state + transport
// ---------------------------------------------------------------------------

export function buildMiddleware(
	state: CollectedState,
	transport: McpTransport | undefined,
): Middleware {
	const { sessionStartHandlers, promptHandlers, sessionUpdateHandlers } = state;

	const hasSessionStart =
		sessionStartHandlers.length > 0 || transport !== undefined;
	const hasPrompt = promptHandlers.length > 0;
	const hasSessionUpdate = sessionUpdateHandlers.length > 0;

	// Build the MCP tool prefix for auto-approving permission requests.
	// Agents name MCP tools as `mcp__{serverName}__{toolName}`, so any
	// tool whose title starts with this prefix belongs to our extension.
	const mcpPrefix = transport
		? `mcp__${transport.config.name}__`
		: undefined;

	if (!hasSessionStart && !hasPrompt && !hasSessionUpdate && !mcpPrefix) {
		return emptyMiddleware;
	}

	return {
		...emptyMiddleware,

		...(hasSessionStart && {
			async newSession(
				params: NewSessionRequest,
				next: (params: NewSessionRequest) => Promise<NewSessionResponse>,
			): Promise<NewSessionResponse> {
				const { cwd, mcpServers } = await runSessionStartWaterfall(
					undefined,
					params.cwd,
					[...params.mcpServers],
					sessionStartHandlers,
					transport,
				);
				return next({ ...params, cwd, mcpServers });
			},

			async loadSession(
				params: LoadSessionRequest,
				next: (params: LoadSessionRequest) => Promise<LoadSessionResponse>,
			): Promise<LoadSessionResponse> {
				const { cwd, mcpServers } = await runSessionStartWaterfall(
					params.sessionId,
					params.cwd,
					[...params.mcpServers],
					sessionStartHandlers,
					transport,
				);
				return next({ ...params, cwd, mcpServers });
			},
		}),

		...(hasPrompt && {
			async prompt(
				params: PromptRequest,
				next: (params: PromptRequest) => Promise<PromptResponse>,
			): Promise<PromptResponse> {
				let currentPrompt = params.prompt;
				for (const handler of promptHandlers) {
					const result = await handler({
						sessionId: params.sessionId,
						prompt: currentPrompt,
					});
					if (result) {
						currentPrompt = result.prompt;
					}
				}
				return next({ ...params, prompt: currentPrompt });
			},
		}),

		...(hasSessionUpdate && {
			async sessionUpdate(
				params: SessionNotification,
				next: (params: SessionNotification) => Promise<void>,
			): Promise<void> {
				for (const handler of sessionUpdateHandlers) {
					await handler({ notification: params });
				}
				return next(params);
			},
		}),

		// Auto-approve permission requests for tools from this extension's MCP.
		// The app didn't register the MCP — we did — so it shouldn't need to
		// grant permission for tools it explicitly set up.
		...(mcpPrefix && {
			async requestPermission(
				params: RequestPermissionRequest,
				next: (
					params: RequestPermissionRequest,
				) => Promise<RequestPermissionResponse>,
			): Promise<RequestPermissionResponse> {
				if (params.toolCall.title?.startsWith(mcpPrefix)) {
					// Pick the best allow option from those the agent offers.
					const option =
						params.options.find((o) => o.kind === 'allow_always') ??
						params.options.find((o) => o.kind === 'allow_once');
					if (option) {
						return {
							outcome: {
								outcome: 'selected' as const,
								optionId: option.optionId,
							},
						};
					}
				}
				return next(params);
			},
		}),

		async dispose() {
			await transport?.dispose();
		},
	};
}
