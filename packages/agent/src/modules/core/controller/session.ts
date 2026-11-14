import type {
	Context,
	ContextPatch,
	LLMConfig,
	Message,
	MiniACPClient,
	Usage,
	UserMessage,
} from '@franklin/mini-acp';
import { UsageTracker } from '@franklin/mini-acp/session';
import type { CoreRegistry } from '../registrations/index.js';
import type { SessionSnapshot } from '../state.js';
import type { ToolRegistry } from '../tools/index.js';
import { createSessionDraft } from '../context/draft/index.js';
import { createContextLedger } from '../context/ledger/index.js';
import { createSessionOperation } from './operation.js';
import { runCompaction } from '../compaction/run.js';
import { estimateContextTokens } from '../compaction/tokens/context.js';
import type { Summarize } from '../compaction/types.js';

// Mini-ACP no longer reports model capacity. Keep the previous conservative
// manual budget for both paths until app-owned model budgets are available.
const CONTEXT_WINDOW = 8192;
const CONTEXT_LIMIT = CONTEXT_WINDOW - Math.floor(CONTEXT_WINDOW / 4);

export type AgentSession = {
	begin(): void;
	end(): void;
	cancel(): void;
	prepare(client: MiniACPClient, incoming?: UserMessage): Promise<void>;
	compact(client: MiniACPClient): Promise<boolean>;
	sync(client: MiniACPClient): Promise<void>;
	recordContext(context: ContextPatch): void;
	recordMessage(message: Message): void;
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
	const compact = async (client: MiniACPClient) => {
		if (!input.summarize) throw new Error('Compaction is unavailable');
		const changed = await runCompaction({
			draft,
			summarize: input.summarize,
			contextWindow: CONTEXT_WINDOW,
			signal: operation.signal(),
			addUsage: (value) => usage.add(value),
		});
		await ledger.ledger.sync(client);
		return changed;
	};
	const estimate = (incoming?: UserMessage) =>
		estimateContextTokens({
			...ledger.getSentContext(),
			messages: [...draft.get().messages, ...(incoming ? [incoming] : [])],
		});

	return {
		begin: () => operation.begin(),
		end: () => operation.end(),
		cancel: () => operation.cancel(),
		async prepare(client, incoming) {
			// The paused raw client already holds cancellation. Let continue() drain
			// its terminal without starting summary work or another provider request.
			if (!incoming && operation.signal().aborted) return;
			operation.signal().throwIfAborted();
			if (!input.summarize || estimate(incoming) <= CONTEXT_LIMIT) return;
			await compact(client);
			if (estimate(incoming) > CONTEXT_LIMIT)
				throw new Error('Context is too large after compaction');
		},
		async compact(client) {
			operation.begin();
			try {
				return await compact(client);
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
		recordMessage(message) {
			ledger.recorder.append(message);
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
