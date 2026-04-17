import type {
	MiniACPClient,
	TurnStart,
	Chunk,
	Update,
	TurnEnd,
	ToolCall,
	ToolExecuteParams,
	ToolResult,
} from '@franklin/mini-acp';
import type { MaybePromise } from '../../../algebra/types/shared.js';
import type { PromptContext } from './prompt-context.js';

// ---------------------------------------------------------------------------
// Core events — the subset of MiniACPClient methods exposed to extensions.
// initialize and setContext are infrastructure concerns handled by the
// tracker decorator and tool injector respectively.
// ---------------------------------------------------------------------------

type CoreEventHandler<K extends keyof MiniACPClient> = (
	params: Parameters<MiniACPClient[K]>[0],
	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
) => MaybePromise<Parameters<MiniACPClient[K]>[0] | void>;

export type CancelHandler = CoreEventHandler<'cancel'>;

export type PromptHandler = (ctx: PromptContext) => MaybePromise<void>;

export type SystemPromptContribution = () => MaybePromise<string | undefined>;

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
