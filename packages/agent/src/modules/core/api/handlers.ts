import type {
	TurnStart,
	Chunk,
	Update,
	TurnEnd,
	ToolCall,
	ToolExecuteParams,
} from '@franklin/mini-acp';
import type { ToolResultWithOutput } from './tool.js';

// ---------------------------------------------------------------------------
// Stream observer events — fire-and-forget side effects on response stream
// ---------------------------------------------------------------------------

export type StreamObserverEvent = 'turnStart' | 'chunk' | 'update' | 'turnEnd';

export type StreamObserverParamsMap = {
	turnStart: TurnStart;
	chunk: Chunk;
	update: Update;
	turnEnd: TurnEnd;
};

export type StreamObserverHandler<K extends StreamObserverEvent> = (
	event: StreamObserverParamsMap[K],
) => void;

// ---------------------------------------------------------------------------
// Tool observer events — fire-and-forget side effects on tool execution
// ---------------------------------------------------------------------------

export type ToolCallEvent = ToolExecuteParams;

export type ToolResultEvent<TOutput = unknown> =
	ToolResultWithOutput<TOutput> & {
		call: ToolCall;
	};
