import type { Ctx } from '../types/context.js';
import type { UserMessage } from '../types/message.js';
import type { SessionId } from '../types/session.js';
import type { StreamEvent } from '../types/stream.js';
import type { ToolCall, ToolResult } from '../types/tool.js';

// ---------------------------------------------------------------------------
// Session Protocol (Mini ACP) — wraps base protocol with session management
// ---------------------------------------------------------------------------

// Agent side (client calls agent)
export interface AgentMethods {
	// Session management
	sessionCreate(params: { ctx: Ctx }): Promise<{ sessionId: SessionId }>;

	sessionSet(params: {
		sessionId: SessionId;
		ctx: Partial<Ctx>;
	}): Promise<void>;

	// S<BaseAgent> — base protocol methods, session-scoped
	sessionPrompt(params: {
		sessionId: SessionId;
		message: UserMessage;
	}): AsyncIterable<StreamEvent>;

	sessionCancel(params: { sessionId: SessionId }): Promise<StreamEvent>;

	sessionLlmSignal(params: {
		sessionId: SessionId;
		payload: unknown;
	}): Promise<void>;
}

// Client side (agent calls client — reverse RPC)
export interface ClientMethods {
	toolExecute(params: {
		sessionId: SessionId;
		call: ToolCall;
	}): Promise<ToolResult>;
}
