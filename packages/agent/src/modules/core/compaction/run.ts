import { estimateMessageTokens } from '@franklin/mini-acp/session';
import type { Usage } from '@franklin/mini-acp';
import type { SessionDraft } from '../context/draft/session.js';
import { projectEntries } from '../history/project.js';
import { prepareCompaction } from './prepare.js';
import type { Summarize } from './types.js';
import { createSummaryMessage } from '../history/summary.js';

type RunCompactionInput = {
	readonly draft: SessionDraft;
	readonly summarize: Summarize;
	readonly keepRecentTokens: number;
	readonly contextWindow: number;
	readonly signal: AbortSignal;
	readonly addUsage: (usage: Usage) => void;
};

export async function runCompaction(
	input: RunCompactionInput,
): Promise<boolean> {
	const { draft, summarize, signal } = input;
	signal.throwIfAborted();
	const prepared = prepareCompaction(
		projectEntries(draft.getEntries()),
		input.keepRecentTokens,
	);
	if (!prepared) return false;
	const revision = draft.revision('messages');
	const configRevision = draft.revision('config');
	const result = await summarize({
		messages: prepared.messages,
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
			prepared.messages.reduce(
				(tokens, message) => tokens + estimateMessageTokens(message),
				0,
			)
	) {
		throw new Error('Compaction did not reduce context');
	}
	draft.compact({
		type: 'compaction',
		id: crypto.randomUUID(),
		summary,
		firstKeptEntryId: prepared.firstKeptEntryId,
	});
	return true;
}
