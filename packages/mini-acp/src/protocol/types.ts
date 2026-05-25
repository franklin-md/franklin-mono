import type { ContextPatch } from '../types/context.js';
import type { UserMessage } from '../types/message.js';
import type { StreamEvent } from '../types/stream.js';
import type { ToolExecuteHandler } from '../types/tool.js';

export interface MuTurn {
	prompt(message: UserMessage): AsyncIterable<StreamEvent>;
	cancel(): Promise<void>;
}

// Agent side (client calls agent)
export interface MuClient extends MuTurn {
	initialize(): Promise<void>;
	setContext(context: ContextPatch): Promise<void>;
}

export interface MuAgent {
	toolExecute: ToolExecuteHandler;
}

export type MiniACPClientHandle = MuClient & { dispose(): Promise<void> };

export type MiniACPConnector = (
	server: MuAgent,
) => MiniACPClientHandle | Promise<MiniACPClientHandle>;
