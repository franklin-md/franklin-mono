import { joinChunks, tokenize } from './chunks.js';
import type {
	AssistantTextDescriptor,
	TextChunkDescriptor,
	TextChunkStreamOptions,
} from './types.js';

export function text(value: string): AssistantTextDescriptor {
	return { type: 'assistantText', text: value };
}

export function textChunks(
	chunks: readonly TextChunkDescriptor[],
): AssistantTextDescriptor {
	return {
		type: 'assistantText',
		text: joinChunks(chunks),
		chunks,
	};
}

export function textChunkStream(
	value: string,
	options: TextChunkStreamOptions = {},
): AssistantTextDescriptor {
	return {
		type: 'assistantText',
		text: value,
		chunks: tokenize(value, options),
	};
}
