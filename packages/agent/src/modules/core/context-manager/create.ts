import { UsageTracker } from '@franklin/mini-acp/session';
import type { CoreRegistry } from '../registrations/index.js';
import type { SessionSnapshot } from '../state.js';
import { ContextLedger } from './context-ledger.js';
import type { ToolFilterProvider } from './context-ledger.js';
import {
	createSystemPromptDrafter,
	createToolDefinitionDrafter,
	type ToolDefinitionDrafter,
} from './drafters.js';
import { SessionDraft } from './session-draft.js';
import { createSystemPromptBuilder } from './system-prompt/index.js';
import type { ContextManager } from './types.js';

type CreateContextManagerInput = {
	readonly snapshot: SessionSnapshot;
	readonly registrations: CoreRegistry;
	readonly toolRegistry: ToolFilterProvider & ToolDefinitionDrafter;
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
	const contextLedger = new ContextLedger({
		draft,
		toolRegistry: input.toolRegistry,
	});

	return {
		contextLedger,
		usageTracker: usage,
		getAgentContext: () => contextLedger.get(),
		add(delta) {
			usage.add(delta);
		},
		getSnapshot() {
			return contextLedger.getSnapshot(usage.get());
		},
	};
}
