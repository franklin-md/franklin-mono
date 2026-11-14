import type { ContextPatch } from '../types/context.js';
import type { UserMessage } from '../types/message.js';
import type { StreamEvent } from '../types/stream.js';
import type { ToolExecuteHandler } from '../types/tool.js';

export interface MuTurn {
	/** Start a user turn and execute one response plus its tool batch. */
	prompt(message: UserMessage): AsyncIterable<StreamEvent>;
	/** Execute one further step; empty after turnEnd. Never adds a user message. */
	continue(): AsyncIterable<StreamEvent>;
	/** Abort active work, or mark a paused turn cancelled for the next continue. */
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
