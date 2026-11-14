export type {
	MockTurnContext,
	MockTurnDescriptor,
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
