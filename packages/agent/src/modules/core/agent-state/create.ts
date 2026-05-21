import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import type { Context, LLMConfig, Message, Usage } from '@franklin/mini-acp';
import { ContextTracker, UsageTracker } from '@franklin/mini-acp/session';
import type { CoreSignature } from '../api/api.js';
import type { SessionSnapshot } from '../state.js';
import { createSystemPromptBuilder } from './system-prompt.js';
import type { RuntimeAgentState } from './types.js';

type LLMConfigSnapshot = SessionSnapshot['llmConfig'];

type CreateRuntimeAgentStateInput<Runtime extends BaseRuntime> = {
	readonly snapshot: SessionSnapshot;
	readonly registrations: RegistryView<CoreSignature, Runtime>;
	readonly getRuntime: () => Runtime;
};

export function createRuntimeAgentState<Runtime extends BaseRuntime>(
	input: CreateRuntimeAgentStateInput<Runtime>,
): RuntimeAgentState {
	const context = new ContextTracker();
	context.apply(createContext(input.snapshot));
	const usage = new UsageTracker();
	usage.add(input.snapshot.usage);
	const systemPrompt = createSystemPromptBuilder({
		registrations: input.registrations,
		getRuntime: input.getRuntime,
		getLastSentSystemPrompt: () => context.get().systemPrompt,
	});

	return {
		contextTracker: context,
		systemPrompt,
		usageTracker: usage,
		getAgentContext: () => context.get(),
		apply(partial) {
			context.apply(partial);
		},
		append(message) {
			context.append(message);
		},
		add(delta) {
			usage.add(delta);
		},
		getSnapshot() {
			return sessionSnapshot(
				context.get().messages,
				pickLLMConfig(context.get().config),
				usage.get(),
			);
		},
	};
}

function createContext(snapshot: SessionSnapshot): Context {
	return {
		systemPrompt: '',
		messages: [...snapshot.messages],
		tools: [],
		config: { ...snapshot.llmConfig },
	};
}

function pickLLMConfig(cfg: LLMConfig): LLMConfigSnapshot {
	return {
		model: cfg.model,
		provider: cfg.provider,
		reasoning: cfg.reasoning,
	};
}

function sessionSnapshot(
	messages: readonly Message[],
	llmConfig: LLMConfigSnapshot,
	usage: Usage,
): SessionSnapshot {
	return {
		messages: [...messages],
		llmConfig,
		usage: snapshotUsage(usage),
	};
}

function snapshotUsage(usage: Usage): Usage {
	return {
		tokens: { ...usage.tokens },
		cost: { ...usage.cost },
	};
}
