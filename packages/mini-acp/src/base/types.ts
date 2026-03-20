import type { StreamEvent } from '../types/stream.js';
import type { ToolExecuteHandler } from '../types/tool.js';
import type { UserMessage } from '../types/message.js';

export type PromptParams = {
	message: UserMessage;
};

export type CancelParams = Record<string, never>;

// Agent side (client calls agent)
export interface BaseAgent {
	prompt(params: PromptParams): AsyncIterable<StreamEvent>;
	cancel(params: CancelParams): Promise<StreamEvent>;
	// llmSignal(params: { payload: unknown }): Promise<void>;
}

// Client side (agent calls client — reverse RPC)
export interface BaseClient {
	toolExecute: ToolExecuteHandler;
}
