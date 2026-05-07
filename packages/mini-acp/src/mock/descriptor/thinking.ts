import { joinChunks, tokenize } from './chunks.js';
import type {
	AssistantThinkingDescriptor,
	TextChunkDescriptor,
	TextChunkStreamOptions,
} from './types.js';

export function thinking(value: string): AssistantThinkingDescriptor {
	return { type: 'assistantThinking', text: value };
}

export function thinkingChunks(
	chunks: readonly TextChunkDescriptor[],
): AssistantThinkingDescriptor {
	return {
		type: 'assistantThinking',
		text: joinChunks(chunks),
		chunks,
	};
}

export function thinkingChunkStream(
	value: string,
	options: TextChunkStreamOptions = {},
): AssistantThinkingDescriptor {
	return {
		type: 'assistantThinking',
		text: value,
		chunks: tokenize(value, options),
		...(options.delayMode === undefined
			? {}
			: { chunkDelayMode: options.delayMode }),
	};
}
