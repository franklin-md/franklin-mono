import type { JsonObject } from '@franklin/lib';
import type { Context } from '../../types/context.js';
import type { UserMessage } from '../../types/message.js';
import type { StopCode } from '../../types/stop-code.js';
import type { TurnEnd } from '../../types/stream.js';
import type { ToolCall, ToolResult } from '../../types/tool.js';

export type TextTokenizer = (text: string) => readonly string[];

export type ChunkDelay = number | ((chunk: string, index: number) => number);

export type ChunkDelayMode = 'relative' | 'elapsed';

export type TextChunkStreamOptions = {
	readonly delayMs?: ChunkDelay;
	readonly delayMode?: ChunkDelayMode;
	readonly tokenizer?: TextTokenizer;
};

export type TextChunkDescriptor = {
	readonly text: string;
	readonly delayMs?: number;
};

export type AssistantTextDescriptor = {
	readonly type: 'assistantText';
	readonly text: string;
	readonly chunks?: readonly TextChunkDescriptor[];
	readonly chunkDelayMode?: ChunkDelayMode;
};

export type AssistantThinkingDescriptor = {
	readonly type: 'assistantThinking';
	readonly text: string;
	readonly chunks?: readonly TextChunkDescriptor[];
	readonly chunkDelayMode?: ChunkDelayMode;
};

export type ToolCallRequestDescriptor = {
	readonly name: string;
	readonly arguments?: JsonObject;
};

export type ToolCallsDescriptor = {
	readonly type: 'toolCalls';
	readonly calls: readonly ToolCallRequestDescriptor[];
};

export type DelayDescriptor = {
	readonly type: 'delay';
	readonly ms: number;
};

export type TurnEndDescriptor = {
	readonly type: 'turnEnd';
	readonly stopCode?: StopCode;
	readonly stopMessage?: string;
	readonly usage?: TurnEnd['usage'];
};

export type MockTurnContext = {
	readonly context: Context;
	readonly prompt: UserMessage;
	readonly toolCalls: readonly ToolCall[];
	readonly toolResults: readonly ToolResult[];
};

export type DeriveDescriptor = {
	readonly type: 'derive';
	readonly run: (
		context: MockTurnContext,
	) => MockTurnDescriptor | Promise<MockTurnDescriptor>;
};

export type MockTurnStepDescriptor =
	| AssistantTextDescriptor
	| AssistantThinkingDescriptor
	| ToolCallsDescriptor
	| DelayDescriptor
	| TurnEndDescriptor
	| DeriveDescriptor;

export type MockTurnDescriptor = readonly MockTurnStepDescriptor[];
