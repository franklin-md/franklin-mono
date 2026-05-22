import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import { UsageTracker } from '@franklin/mini-acp/session';
import type { CoreSignature } from '../api/api.js';
import { registeredTools } from '../compile/registrations/index.js';
import { serializeTool } from '../compile/tools/index.js';
import type { SessionSnapshot } from '../state.js';
import { PromptContextLedger } from './prompt-context.js';
import { createSystemPromptBuilder } from './system-prompt.js';
import type { AgentState } from './types.js';

type CreateAgentStateInput<Runtime extends BaseRuntime> = {
	readonly snapshot: SessionSnapshot;
	readonly registrations: RegistryView<CoreSignature, Runtime>;
	readonly getRuntime: () => Runtime;
};

export function createAgentState<Runtime extends BaseRuntime>(
	input: CreateAgentStateInput<Runtime>,
): AgentState {
	const usage = new UsageTracker();
	usage.add(input.snapshot.usage);
	const tools = registeredTools(input.registrations).map(serializeTool);
	const systemPrompt = createSystemPromptBuilder({
		registrations: input.registrations,
		getRuntime: input.getRuntime,
	});
	const promptContext = new PromptContextLedger({
		snapshot: input.snapshot,
		systemPrompt,
		tools,
	});

	return {
		promptContext,
		usageTracker: usage,
		getAgentContext: () => promptContext.get(),
		add(delta) {
			usage.add(delta);
		},
		getSnapshot() {
			return promptContext.getSnapshot(usage.get());
		},
	};
}
