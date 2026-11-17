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
import { getModelContextWindow } from '@franklin/mini-acp';
import type { CoreRegistry } from '../registrations/index.js';
import type { SessionSnapshot } from '../state.js';
import type { ToolRegistry } from '../tools/index.js';
import { createSessionDraft } from '../context/draft/index.js';
import { createContextLedger } from '../context/ledger/index.js';
import { runCompaction } from '../compaction/run.js';
import { estimateContextTokens } from '../compaction/tokens/context.js';
import type { Summarize } from '../compaction/types.js';

// Preserve the planning fallback for configs outside the built-in catalog.
const FALLBACK_CONTEXT_WINDOW = 8192;

export type AgentSession = {
	prepare(
		client: MiniACPClient,
		signal: AbortSignal,
		incoming?: UserMessage,
	): Promise<void>;
	compact(client: MiniACPClient, signal: AbortSignal): Promise<boolean>;
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
	const contextWindow = () =>
		getModelContextWindow(draft.get().config) ?? FALLBACK_CONTEXT_WINDOW;
	const compact = async (
		client: MiniACPClient,
		signal: AbortSignal,
		window = contextWindow(),
	) => {
		if (!input.summarize) throw new Error('Compaction is unavailable');
		const changed = await runCompaction({
			draft,
			summarize: input.summarize,
			contextWindow: window,
			signal,
			addUsage: (value) => usage.add(value),
		});
		await ledger.ledger.sync(client);
		signal.throwIfAborted();
		return changed;
	};
	const estimate = (incoming?: UserMessage) =>
		estimateContextTokens({
			...ledger.getSentContext(),
			messages: [...draft.get().messages, ...(incoming ? [incoming] : [])],
		});

	return {
		async prepare(client, signal, incoming) {
			signal.throwIfAborted();
			if (!input.summarize) return;
			// Resolve from the current config at every boundary so model changes
			// affect both the trigger and the summarizer's chunk budget together.
			const window = contextWindow();
			const limit = window - Math.min(16_384, Math.floor(window / 4));
			if (estimate(incoming) <= limit) return;
			await compact(client, signal, window);
			if (estimate(incoming) > limit)
				throw new Error('Context is too large after compaction');
		},
		compact,
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
