import type {
	LoadSessionRequest,
	LoadSessionResponse,
	McpServer,
	NewSessionRequest,
	NewSessionResponse,
	PromptRequest,
	PromptResponse,
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

	if (!hasSessionStart && !hasPrompt && !hasSessionUpdate) {
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

		async dispose() {
			await transport?.dispose();
		},
	};
}
