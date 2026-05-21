import type {
	TurnStart,
	Chunk,
	Update,
	TurnEnd,
	ToolCall,
	ToolExecuteParams,
	ToolResult,
} from '@franklin/mini-acp';
import type { MaybePromise } from '../../../utils/maybe-promise.js';
import type { Prompt } from './prompt.js';
import type { SystemPrompt } from './system-prompt.js';

// ---------------------------------------------------------------------------
export type PromptHandler = (prompt: Prompt) => MaybePromise<void>;

export type SystemPromptHandler = (
	systemPrompt: SystemPrompt,
) => MaybePromise<void>;

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

export type ToolObserverEvent = 'toolCall' | 'toolResult';

export type ToolObserverParamsMap = {
	toolCall: ToolExecuteParams;
	toolResult: ToolResult & { call: ToolCall };
};

export type ToolObserverHandler<K extends ToolObserverEvent> = (
	event: ToolObserverParamsMap[K],
) => void;
