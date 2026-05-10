export type {
	AssistantTextDescriptor,
	AssistantThinkingDescriptor,
	ChunkDelay,
	ChunkDelayMode,
	DelayDescriptor,
	DeriveDescriptor,
	MockTurnContext,
	MockTurnDescriptor,
	MockTurnStepDescriptor,
	TextChunkDescriptor,
	TextChunkStreamOptions,
	TextTokenizer,
	ToolCallRequestDescriptor,
	ToolCallsDescriptor,
	TurnEndDescriptor,
} from './descriptor/index.js';

export {
	delay,
	derive,
	finishedTurn,
	text,
	textChunks,
	textChunkStream,
	thinking,
	thinkingChunks,
	thinkingChunkStream,
	toolCalls,
	turn,
	turnEnd,
} from './descriptor/index.js';

export type { CreateMockMiniACPOptions, MockMiniACP } from './create.js';
export { createMockMiniACP } from './create.js';
export type { MockMiniACPRecording } from './recording.js';
