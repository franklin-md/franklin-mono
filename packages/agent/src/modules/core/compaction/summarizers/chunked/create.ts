import type { MiniACPConnector } from '@franklin/mini-acp';
import { UsageTracker } from '@franklin/mini-acp/session';
import type { Summarize } from '../../types.js';
import { createSummaryClient } from './client.js';
import { createChunks } from './chunks.js';
import { serializeMessages } from './serialize.js';
import { summarizeChunk } from './summarize-chunk.js';

export function createChunkedSummarizer(
	connectAgent: MiniACPConnector,
): Summarize {
	return async ({ messages, config, contextWindow, signal }) => {
		signal.throwIfAborted();
		const chunks = createChunks(serializeMessages(messages), contextWindow);
		const connection = await createSummaryClient(connectAgent, config, signal);
		try {
			const summaries: string[] = [];
			const usage = new UsageTracker();
			for (const chunk of chunks) {
				const result = await summarizeChunk(connection.client, {
					...chunk,
					previousSummaries: summaries.join('\n\n'),
					signal,
				});
				// Keep earlier summaries verbatim. They inform later chunks, but each
				// result describes only its own chunk rather than rewriting the prefix.
				summaries.push(result.summary);
				usage.add(result.usage);
			}
			return { summary: summaries.join('\n\n'), usage: usage.get() };
		} finally {
			await connection.dispose();
		}
	};
}
