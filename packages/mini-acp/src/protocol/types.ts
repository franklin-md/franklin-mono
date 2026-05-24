import type { ContextPatch } from '../types/context.js';
import type { UserMessage } from '../types/message.js';
import type { StreamEvent } from '../types/stream.js';
import type { ToolExecuteHandler } from '../types/tool.js';

// Agent side (client calls agent)
export interface MuClient {
	initialize(): Promise<void>;
	setContext(context: ContextPatch): Promise<void>;
	prompt(message: UserMessage): AsyncIterable<StreamEvent>;
	cancel(): Promise<void>;
}

export interface MuAgent {
	toolExecute: ToolExecuteHandler;
}

export type MiniACPClientHandle = MuClient & { dispose(): Promise<void> };

export type MiniACPConnector = (
	server: MuAgent,
) => MiniACPClientHandle | Promise<MiniACPClientHandle>;
