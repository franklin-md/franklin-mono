import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import { UsageTracker } from '@franklin/mini-acp/session';
import type { CoreSignature } from '../api/api.js';
import type { SessionSnapshot } from '../state.js';
import {
	ContextLedger,
	type ToolDefinitionProvider,
} from './context-ledger.js';
import { createSystemPromptBuilder } from './system-prompt.js';
import type { AgentState } from './types.js';

type CreateAgentStateInput<Runtime extends BaseRuntime> = {
	readonly snapshot: SessionSnapshot;
	readonly registrations: RegistryView<CoreSignature, Runtime>;
	readonly getRuntime: () => Runtime;
	readonly toolRegistry: ToolDefinitionProvider;
};

export function createAgentState<Runtime extends BaseRuntime>(
	input: CreateAgentStateInput<Runtime>,
): AgentState {
	const usage = new UsageTracker();
	usage.add(input.snapshot.usage);
	const systemPrompt = createSystemPromptBuilder({
		registrations: input.registrations,
		getRuntime: input.getRuntime,
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
