import type { StreamEvent, TurnEnd } from '../types/stream.js';
import type { ToolExecuteHandler } from '../types/tool.js';
import type { UserMessage } from '../types/message.js';

export type PromptParams = {
	message: UserMessage;
};

export type CancelParams = Record<string, never>;

// Agent side (client calls agent)
export interface TurnClient {
	// TODO: Should return TurnEnd rather than nothing
	prompt(params: PromptParams): AsyncIterable<StreamEvent>;
	cancel(params: CancelParams): Promise<TurnEnd>;
	// llmSignal(params: { payload: unknown }): Promise<void>;
}

// Client side (agent calls client — reverse RPC)
export interface TurnAgent {
	toolExecute: ToolExecuteHandler;
}
