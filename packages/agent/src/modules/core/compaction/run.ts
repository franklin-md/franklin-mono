import { estimateMessageTokens } from './tokens/message.js';
import type { Usage } from '@franklin/mini-acp';
import type { SessionDraft } from '../context/draft/session.js';
import { projectEntries } from '../history/project.js';
import type { Summarize } from './types.js';
import { createSummaryMessage } from '../history/summary.js';

type RunCompactionInput = {
	readonly draft: SessionDraft;
	readonly summarize: Summarize;
	readonly contextWindow: number;
	readonly signal: AbortSignal;
	readonly addUsage: (usage: Usage) => void;
};

export async function runCompaction(
	input: RunCompactionInput,
): Promise<boolean> {
	const { draft, summarize, signal } = input;
	signal.throwIfAborted();
	const entries = draft.getEntries();
	if (entries.length === 0 || entries.at(-1)?.type === 'compaction')
		return false;
	// A merged history checkpoint replaces the entire projected prefix. The
	// complete tool batch has settled before the controller invokes this.
	const messages = projectEntries(entries);
	const revision = draft.revision('messages');
	const configRevision = draft.revision('config');
	const result = await summarize({
		messages,
		config: draft.get().config,
		contextWindow: input.contextWindow,
		signal,
	});
	input.addUsage(result.usage);
	signal.throwIfAborted();
	if (
		revision !== draft.revision('messages') ||
		configRevision !== draft.revision('config')
	)
		throw new Error('Session changed during compaction');
	const summary = result.summary.trim();
	const summaryTokens = estimateMessageTokens(createSummaryMessage(summary));
	if (
		!summary ||
		summaryTokens >=
			messages.reduce(
				(tokens, message) => tokens + estimateMessageTokens(message),
				0,
			)
	) {
		throw new Error('Compaction did not reduce context');
	}
	draft.appendCheckpoint({ type: 'compaction', summary });
	return true;
}
