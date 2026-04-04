import type { StreamEvent } from '../types/stream.js';
import type { ToolExecuteHandler } from '../types/tool.js';
import type { UserMessage } from '../types/message.js';

// Agent side (client calls agent)
export interface TurnClient {
	prompt(message: UserMessage): AsyncIterable<StreamEvent>;
	cancel(): Promise<void>;
}

// Client side (agent calls client — reverse RPC)
export interface TurnServer {
	toolExecute: ToolExecuteHandler;
}
