import type {
	Context,
	ContextPatch,
	LLMConfig,
	Message,
	MiniACPClient,
	Usage,
} from '@franklin/mini-acp';
import { UsageTracker } from '@franklin/mini-acp/session';
import type { CoreRegistry } from '../registrations/index.js';
import type { SessionSnapshot } from '../state.js';
import type { ToolRegistry } from '../tools/index.js';
import { createSessionDraft } from '../context/draft/index.js';
import { createContextLedger } from '../context/ledger/index.js';

export type AgentSession = {
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
};

export function createAgentSession(
	input: CreateAgentSessionInput,
): AgentSession {
	const usage = new UsageTracker();
	usage.add(input.snapshot.usage);
	const draft = createSessionDraft(input);
	const ledger = createContextLedger({ draft });

	return {
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
			const draft = ledger.ledger.getDraft();
			return {
				// Snapshot callers receive copies of draft-owned collections so they
				// cannot mutate the live session draft.
				messages: [...draft.messages],
				llmConfig: pickLLMConfig(draft.config),
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
