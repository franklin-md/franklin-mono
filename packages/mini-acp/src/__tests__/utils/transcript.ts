import type { Transcript, TranscriptEntry } from '../../spec-tester/types.js';

export function receives<M extends TranscriptEntry['method']>(
	transcript: Transcript,
	method: M,
): Array<Extract<TranscriptEntry, { direction: 'receive'; method: M }>> {
	return transcript.filter(
		(
			entry,
		): entry is Extract<TranscriptEntry, { direction: 'receive'; method: M }> =>
			entry.direction === 'receive' && entry.method === method,
	);
}

export function sends<M extends TranscriptEntry['method']>(
	transcript: Transcript,
	method: M,
): Array<Extract<TranscriptEntry, { direction: 'send'; method: M }>> {
	return transcript.filter(
		(
			entry,
		): entry is Extract<TranscriptEntry, { direction: 'send'; method: M }> =>
			entry.direction === 'send' && entry.method === method,
	);
}

export function assistantText(transcript: Transcript): string {
	return receives(transcript, 'update')
		.filter((entry) => entry.params.message.role === 'assistant')
		.flatMap((entry) => entry.params.message.content)
		.filter((block) => block.type === 'text')
		.map((block) => block.text)
		.join('');
}
