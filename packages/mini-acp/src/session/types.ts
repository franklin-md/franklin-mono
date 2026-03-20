import type { CancelParams, PromptParams } from '../base/types.js';
import type { Ctx } from '../types/context.js';
import type { StreamEvent } from '../types/stream.js';
import type { ToolExecuteParams, ToolResult } from '../types/tool.js';

type AgentCtx = { ctx: Partial<Ctx> };

// Agent side (client calls agent)
export interface AgentMethods {
	// Session management
	initialize(): Promise<void>;

	setContext(params: AgentCtx): Promise<void>;

	// S<BaseAgent> — base protocol methods, session-scoped
	prompt(params: PromptParams): AsyncIterable<StreamEvent>;

	cancel(params: CancelParams): Promise<StreamEvent>;
}

// Client side (agent calls client — reverse RPC)
export interface ClientMethods {
	toolExecute(params: ToolExecuteParams): Promise<ToolResult>;
}
