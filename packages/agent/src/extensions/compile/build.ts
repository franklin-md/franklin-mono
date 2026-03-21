import type {
	AnyMessage,
	LoadSessionRequest,
	McpServer,
	NewSessionRequest,
	PromptRequest,
	RequestPermissionRequest,
	SessionNotification,
} from '@agentclientprotocol/sdk';
import { AGENT_METHODS, CLIENT_METHODS } from '@agentclientprotocol/sdk';

import type { McpTransport } from '@franklin/local-mcp';
import {
	intercept,
	matchNotification,
	matchRequest,
	rpcResponse,
	withParams,
} from '@franklin/transport';
import type { RpcMessage } from '@franklin/transport';

import type { AgentMiddleware } from '../../types.js';
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
// Command-side waterfalls (app → agent)
// ---------------------------------------------------------------------------

async function transformCommand(
	msg: RpcMessage,
	sessionStartHandlers: SessionStartHandler[],
	promptHandlers: CollectedState['promptHandlers'],
	transport: McpTransport | undefined,
): Promise<RpcMessage> {
	// session/new or session/load — run sessionStart waterfall
	const newReq = matchRequest<NewSessionRequest>(
		msg,
		AGENT_METHODS.session_new,
	);
	const loadReq =
		!newReq &&
		matchRequest<LoadSessionRequest>(msg, AGENT_METHODS.session_load);
	const sessionReq = newReq ?? loadReq;

	if (
		sessionReq &&
		(sessionStartHandlers.length > 0 || transport !== undefined)
	) {
		const sessionId = loadReq ? loadReq.params.sessionId : undefined;
		const { cwd, mcpServers } = await runSessionStartWaterfall(
			sessionId,
			sessionReq.params.cwd,
			[...sessionReq.params.mcpServers],
			sessionStartHandlers,
			transport,
		);
		return withParams(sessionReq, {
			...sessionReq.params,
			cwd,
			mcpServers,
		});
	}

	// session/prompt — run prompt waterfall
	const promptReq = matchRequest<PromptRequest>(
		msg,
		AGENT_METHODS.session_prompt,
	);
	if (promptReq && promptHandlers.length > 0) {
		let currentPrompt = promptReq.params.prompt;
		for (const handler of promptHandlers) {
			const result = await handler({
				sessionId: promptReq.params.sessionId,
				prompt: currentPrompt,
			});
			if (result) {
				currentPrompt = result.prompt;
			}
		}
		return withParams(promptReq, {
			...promptReq.params,
			prompt: currentPrompt,
		});
	}

	return msg;
}

// ---------------------------------------------------------------------------
// buildMiddleware — construct AgentMiddleware from collected state + transport
// ---------------------------------------------------------------------------

export function buildMiddleware(
	state: CollectedState,
	transport: McpTransport | undefined,
): AgentMiddleware {
	const { sessionStartHandlers, promptHandlers, sessionUpdateHandlers } = state;

	const mcpPrefix = transport ? `mcp__${transport.config.name}__` : undefined;

	const hasAnything =
		sessionStartHandlers.length > 0 ||
		promptHandlers.length > 0 ||
		sessionUpdateHandlers.length > 0 ||
		transport !== undefined;

	if (!hasAnything) {
		return (t) => t;
	}

	return (agentTransport) => {
		const wrapped = intercept(agentTransport, {
			// Commands: app → agent (waterfall transforms)
			writable: async (msg, passWrite) => {
				const transformed = await transformCommand(
					msg as RpcMessage,
					sessionStartHandlers,
					promptHandlers,
					transport,
				);
				passWrite(transformed as AnyMessage);
			},

			// Events: agent → app (side-effects + short-circuit)
			readable: async (msg, addToRead, passWriteReply) => {
				// sessionUpdate — fire handlers, forward unchanged
				const updateNotif = matchNotification<SessionNotification>(
					msg as RpcMessage,
					CLIENT_METHODS.session_update,
				);
				if (updateNotif && sessionUpdateHandlers.length > 0) {
					for (const handler of sessionUpdateHandlers) {
						await handler({ notification: updateNotif.params });
					}
					addToRead(msg);
					return;
				}

				// requestPermission — auto-approve tools from this extension
				if (mcpPrefix) {
					const permReq = matchRequest<RequestPermissionRequest>(
						msg as RpcMessage,
						CLIENT_METHODS.session_request_permission,
					);
					if (permReq?.params.toolCall.title?.startsWith(mcpPrefix)) {
						const option =
							permReq.params.options.find((o) => o.kind === 'allow_always') ??
							permReq.params.options.find((o) => o.kind === 'allow_once');
						if (option) {
							passWriteReply(
								rpcResponse(permReq.id, {
									outcome: {
										outcome: 'selected' as const,
										optionId: option.optionId,
									},
								}) as AnyMessage,
							);
							return; // don't forward to app
						}
					}
				}

				addToRead(msg);
			},
		});

		return {
			...wrapped,
			close: async () => {
				await transport?.dispose();
				await wrapped.close();
			},
		};
	};
}
