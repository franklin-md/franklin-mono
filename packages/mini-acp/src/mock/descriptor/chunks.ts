import type { TextChunkDescriptor, TextChunkStreamOptions } from './types.js';

export function tokenize(
	value: string,
	options: TextChunkStreamOptions,
): TextChunkDescriptor[] {
	const tokenizer = options.tokenizer ?? defaultTokenizer;
	return tokenizer(value).map((chunk, index) => {
		const delayMs =
			typeof options.delayMs === 'function'
				? options.delayMs(chunk, index)
				: options.delayMs;
		return delayMs === undefined ? { text: chunk } : { text: chunk, delayMs };
	});
}

export function joinChunks(chunks: readonly TextChunkDescriptor[]): string {
	return chunks.map((chunk) => chunk.text).join('');
}

function defaultTokenizer(value: string): readonly string[] {
	return value.split('');
}
