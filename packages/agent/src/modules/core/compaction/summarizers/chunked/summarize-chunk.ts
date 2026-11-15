import { collect, StopCode } from '@franklin/mini-acp';
import type { MiniACPClientHandle } from '@franklin/mini-acp';

type ChunkInput = {
	readonly text: string;
	readonly previousSummaries: string;
	readonly maxSummaryCharacters: number;
	readonly signal: AbortSignal;
};

export async function summarizeChunk(
	client: MiniACPClientHandle,
	input: ChunkInput,
) {
	const { signal, text, previousSummaries, maxSummaryCharacters } = input;
	signal.throwIfAborted();
	// Each request contains only prior summaries and this chunk. Keeping earlier
	// requests would duplicate both raw chunks and their summaries in context.
	await client.setContext({ messages: [] });
	signal.throwIfAborted();
	const result = await collect(
		client.prompt({
			role: 'user',
			content: [
				{
					type: 'text',
					text: `${previousSummaries ? `Prior summaries (context only):\n${previousSummaries}\n\n` : ''}New conversation chunk:\n${text}\n\nReturn a summary of only this chunk in at most ${maxSummaryCharacters} characters.`,
				},
			],
		}),
	);
	signal.throwIfAborted();
	if (result.turnEnd?.stopCode !== StopCode.Finished)
		throw new Error('Compaction summary failed');
	const summary = result.messages
		.filter((message) => message.role === 'assistant')
		.flatMap((message) =>
			message.content.flatMap((block) =>
				block.type === 'text' ? [block.text] : [],
			),
		)
		.join('\n')
		.trim();
	if (!summary || summary.length > maxSummaryCharacters)
		throw new Error('Invalid compaction summary');
	return { summary, usage: result.turnEnd.usage };
}
