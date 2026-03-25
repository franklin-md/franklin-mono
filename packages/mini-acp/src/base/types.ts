import type { Chunk, TurnEnd, Update } from '../types/stream.js';
import type { ToolExecuteHandler } from '../types/tool.js';
import type { UserMessage } from '../types/message.js';

export type PromptParams = {
	message: UserMessage;
};

export type CancelParams = Record<string, never>;

// Agent side (client calls agent)
export interface TurnClient {
	prompt(params: PromptParams): AsyncIterable<Chunk | Update | TurnEnd>;
	cancel(params: CancelParams): Promise<void>;
}

// Client side (agent calls client — reverse RPC)
export interface TurnServer {
	toolExecute: ToolExecuteHandler;
}
