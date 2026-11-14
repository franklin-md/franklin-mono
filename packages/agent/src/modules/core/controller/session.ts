import type {
	Context,
	ContextPatch,
	LLMConfig,
	Message,
	MiniACPClient,
	Usage,
	PrepareContextParams,
} from '@franklin/mini-acp';
import { UsageTracker } from '@franklin/mini-acp/session';
import type { CoreRegistry } from '../registrations/index.js';
import type { SessionSnapshot } from '../state.js';
import type { ToolRegistry } from '../tools/index.js';
import { createSessionDraft } from '../context/draft/index.js';
import { createContextLedger } from '../context/ledger/index.js';
import { estimateContextTokens } from '@franklin/mini-acp/session';
import { createSessionOperation } from './operation.js';
import { runCompaction } from '../compaction/run.js';
import type { Summarize } from '../compaction/types.js';

export type AgentSession = {
	sync(client: MiniACPClient): Promise<void>;
	recordContext(context: ContextPatch): void;
	recordMessage(message: Message, messageId?: string): void;
	begin(): void;
	end(): void;
	cancel(): void;
	waitForUpdate(id?: string): Promise<void>;
	prepareContext(
		params: PrepareContextParams,
		client: MiniACPClient,
	): Promise<void>;
	compact(client: MiniACPClient): Promise<boolean>;
	addUsage(usage: Usage): void;
	getSentContext(): Context;
	getSnapshot(): SessionSnapshot;
};

type CreateAgentSessionInput = {
	readonly snapshot: SessionSnapshot;
	readonly registrations: CoreRegistry;
	readonly toolRegistry: ToolRegistry;
	readonly summarize?: Summarize;
};

export function createAgentSession(
	input: CreateAgentSessionInput,
): AgentSession {
	const usage = new UsageTracker();
	usage.add(input.snapshot.usage);
	const draft = createSessionDraft(input);
	const ledger = createContextLedger({ draft });
	const operation = createSessionOperation();
	let contextWindow = 8192;
	const compact = async (client: MiniACPClient, keepRecentTokens: number) => {
		if (!input.summarize) throw new Error('Compaction is unavailable');
		const changed = await runCompaction({
			draft,
			summarize: input.summarize,
			keepRecentTokens,
			contextWindow,
			signal: operation.signal(),
			addUsage: (value) => usage.add(value),
		});
		await ledger.ledger.syncMessages(client);
		return changed;
	};

	return {
		begin: () => operation.begin(),
		end: () => operation.end(),
		cancel: () => operation.cancel(),
		waitForUpdate: operation.waitForUpdate.bind(operation),
		async prepareContext(params, client) {
			await operation.waitForUpdate(params.afterMessageId);
			operation.signal().throwIfAborted();
			contextWindow = params.contextWindow;
			if (!input.summarize) return;
			const limit =
				contextWindow - Math.min(16_384, Math.floor(contextWindow / 4));
			if (params.contextTokens <= limit) return;
			await compact(client, Math.min(20_000, Math.floor(limit / 3)));
			const context = {
				...ledger.getSentContext(),
				messages: draft.get().messages,
			};
			if (estimateContextTokens(context) > limit)
				throw new Error('Context is too large after compaction');
		},
		async compact(client) {
			operation.begin();
			try {
				return await compact(client, 20_000);
			} finally {
				operation.end();
			}
		},
		sync(client) {
			return ledger.ledger.sync(client);
		},
		recordContext(context) {
			ledger.recorder.apply(context);
		},
		recordMessage(message, messageId) {
			ledger.recorder.append(message);
			if (messageId) operation.recordUpdate(messageId);
		},
		addUsage(turnUsage) {
			usage.add(turnUsage);
		},
		getSentContext: ledger.getSentContext,
		getSnapshot() {
			const context = ledger.ledger.getDraft();
			return {
				// Snapshot callers receive copies of draft-owned collections so they
				// cannot mutate the live session draft.
				entries: draft.getEntries(),
				llmConfig: pickLLMConfig(context.config),
				usage: snapshotUsage(usage.get()),
				toolFilter: input.toolRegistry.filter(),
			};
		},
	};
}

function snapshotUsage(usage: Usage): Usage {
	return {
		tokens: { ...usage.tokens },
		cost: { ...usage.cost },
	};
}

function pickLLMConfig(cfg: LLMConfig): SessionSnapshot['llmConfig'] {
	return {
		model: cfg.model,
		provider: cfg.provider,
		reasoning: cfg.reasoning,
	};
}
