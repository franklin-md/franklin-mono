import { encode } from '@franklin/lib';

export interface NdjsonDecoder<T> {
	write(chunk: Uint8Array): T[];
	flush(): T[];
}

export function encodeNdjsonLine(value: unknown): Uint8Array {
	return encode(JSON.stringify(value) + '\n');
}

export function createNdjsonDecoder<T>(): NdjsonDecoder<T> {
	const decoder = new TextDecoder();
	let lineBuffer = '';

	function processLines(): T[] {
		const messages: T[] = [];
		let newlineIdx: number;

		while ((newlineIdx = lineBuffer.indexOf('\n')) !== -1) {
			const line = lineBuffer.slice(0, newlineIdx).trim();
			lineBuffer = lineBuffer.slice(newlineIdx + 1);

			if (!line) continue;

			try {
				messages.push(JSON.parse(line) as T);
			} catch {
				// Malformed line — skip
			}
		}

		return messages;
	}

	return {
		write(chunk) {
			lineBuffer += decoder.decode(chunk, { stream: true });
			return processLines();
		},
		flush() {
			lineBuffer += decoder.decode();
			return processLines();
		},
	};
}
