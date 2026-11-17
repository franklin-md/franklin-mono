import type { ContextPatch } from '../types/context.js';
import type { UserMessage } from '../types/message.js';
import type { StreamEvent } from '../types/stream.js';
import type { ToolExecuteHandler } from '../types/tool.js';

export interface MuTurn {
	/**
	 * Start a user turn; this stream ends at stepEnd or turnEnd after one response
	 * and its tool batch. Consume subsequent continue streams for the whole turn.
	 */
	prompt(message: UserMessage): AsyncIterable<StreamEvent>;
	/**
	 * Execute one further step; empty after turnEnd. Never adds a user message.
	 * After paused cancellation, emits only turnEnd(Cancelled), without inference.
	 */
	continue(): AsyncIterable<StreamEvent>;
	/**
	 * Abort active work, or mark a paused turn cancelled for the next continue.
	 * Active streams end with turnEnd(Cancelled). After stepEnd, the client must
	 * consume another continue to receive it before starting a new prompt.
	 */
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
