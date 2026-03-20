import type { StreamEvent } from '../types/stream.js';
import type { ToolExecuteHandler } from '../types/tool.js';
import type { UserMessage } from '../types/message.js';

// ---------------------------------------------------------------------------
// Base Protocol — sessionless, one agent, one conversation
// ---------------------------------------------------------------------------

// Agent side (client calls agent)
export interface BaseAgent {
	prompt(params: { message: UserMessage }): AsyncIterable<StreamEvent>;
	cancel(params: Record<string, never>): Promise<StreamEvent>;
	// llmSignal(params: { payload: unknown }): Promise<void>;
}

// Client side (agent calls client — reverse RPC)
export interface BaseClient {
	toolExecute: ToolExecuteHandler;
}
