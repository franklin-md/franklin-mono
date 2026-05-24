import { UsageTracker } from '@franklin/mini-acp/session';
import type { Usage } from '@franklin/mini-acp';
import type { CoreRegistry } from '../registrations/index.js';
import type { SessionSnapshot } from '../state.js';
import type { ToolRegistry } from '../tools/index.js';
import { createContextLedger } from './ledger/index.js';
import {
	createSystemPromptDrafter,
	createToolDefinitionDrafter,
} from './drafters.js';
import { pickLLMConfig, SessionDraft } from './session-draft.js';
import { createSystemPromptBuilder } from './system-prompt/index.js';
import type { ContextManager } from './types.js';

type CreateContextManagerInput = {
	readonly snapshot: SessionSnapshot;
	readonly registrations: CoreRegistry;
	readonly toolRegistry: ToolRegistry;
};

export function createContextManager(
	input: CreateContextManagerInput,
): ContextManager {
	const usage = new UsageTracker();
	usage.add(input.snapshot.usage);
	const systemPrompt = createSystemPromptBuilder({
		registrations: input.registrations,
	});
	const draft = SessionDraft.fromSnapshot(input.snapshot);
	draft.addDrafter(createSystemPromptDrafter(systemPrompt));
	draft.addDrafter(createToolDefinitionDrafter(input.toolRegistry));
	const contextLedger = createContextLedger({ draft });

	return {
		contextLedger: contextLedger.ledger,
		contextRecorder: contextLedger.recorder,
		usageTracker: usage,
		getAgentContext: contextLedger.getSentContext,
		getSnapshot() {
			const draft = contextLedger.ledger.getDraft();
			return {
				// Snapshot callers receive copies of draft-owned collections so they
				// cannot mutate the ledger's live session draft.
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
