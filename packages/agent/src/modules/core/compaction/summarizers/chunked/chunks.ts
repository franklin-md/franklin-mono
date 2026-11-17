export function createChunks(transcript: string, contextWindow: number) {
	if (!Number.isFinite(contextWindow) || contextWindow < 256)
		throw new Error('Invalid compaction context window');
	// Reserve room for prior summaries, instructions, and output. These character
	// limits are conservative heuristics, not a provider tokenizer guarantee.
	const chunkSize = Math.min(120_000, Math.floor(contextWindow / 2) * 3);
	const count = Math.ceil(transcript.length / chunkSize);
	const totalSummaryCharacters = Math.min(16_000, Math.floor(contextWindow));
	const maxSummaryCharacters = Math.floor(
		(totalSummaryCharacters - Math.max(0, count - 1) * 2) / Math.max(1, count),
	);
	if (maxSummaryCharacters < 1)
		throw new Error('Too many chunks for the compaction summary budget');
	return Array.from({ length: count }, (_, index) => ({
		text: transcript.slice(index * chunkSize, (index + 1) * chunkSize),
		maxSummaryCharacters,
	}));
}
