import { UsageTracker } from '@franklin/mini-acp/session';
import type { CoreRegistry } from '../compile/registrations/index.js';
import type { SessionSnapshot } from '../state.js';
import {
	ContextLedger,
	type ToolDefinitionProvider,
} from './context-ledger.js';
import { createSystemPromptBuilder } from './system-prompt/index.js';
import type { AgentState } from './types.js';

type CreateAgentStateInput = {
	readonly snapshot: SessionSnapshot;
	readonly registrations: CoreRegistry;
	readonly toolRegistry: ToolDefinitionProvider;
};

export function createAgentState(input: CreateAgentStateInput): AgentState {
	const usage = new UsageTracker();
	usage.add(input.snapshot.usage);
	const systemPrompt = createSystemPromptBuilder({
		registrations: input.registrations,
	});
	const contextLedger = new ContextLedger({
		snapshot: input.snapshot,
		systemPrompt,
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
