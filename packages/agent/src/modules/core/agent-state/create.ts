import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import type {
	Context,
	LLMConfig,
	Message,
	ToolDefinition,
	Usage,
} from '@franklin/mini-acp';
import { ContextTracker, UsageTracker } from '@franklin/mini-acp/session';
import type { CoreSignature } from '../api/api.js';
import { registeredTools } from '../compile/registrations/index.js';
import { serializeTool } from '../compile/tools/index.js';
import type { SessionSnapshot } from '../state.js';
import { copyContextPatch } from './context-copy.js';
import { createPromptContextSync } from './prompt-context.js';
import { createSystemPromptBuilder } from './system-prompt.js';
import type { AgentState } from './types.js';

type LLMConfigSnapshot = SessionSnapshot['llmConfig'];

type CreateAgentStateInput<Runtime extends BaseRuntime> = {
	readonly snapshot: SessionSnapshot;
	readonly registrations: RegistryView<CoreSignature, Runtime>;
	readonly getRuntime: () => Runtime;
};

export function createAgentState<Runtime extends BaseRuntime>(
	input: CreateAgentStateInput<Runtime>,
): AgentState {
	const confirmed = new ContextTracker();
	const desired = new ContextTracker();
	const usage = new UsageTracker();
	usage.add(input.snapshot.usage);
	const tools = registeredTools(input.registrations).map(serializeTool);
	desired.apply(createContext(input.snapshot, tools));
	const trackingContext = createMirroredContextTracker(confirmed, desired);
	const systemPrompt = createSystemPromptBuilder({
		registrations: input.registrations,
		getRuntime: input.getRuntime,
		getLastSentSystemPrompt: () => confirmed.get().systemPrompt,
	});
	const promptContext = createPromptContextSync({
		confirmed,
		desired,
		systemPrompt,
		tools,
	});

	return {
		contextTracker: trackingContext,
		promptContext,
		systemPrompt,
		usageTracker: usage,
		getAgentContext: () => confirmed.get(),
		apply(partial) {
			trackingContext.apply(partial);
		},
		append(message) {
			trackingContext.append(message);
		},
		add(delta) {
			usage.add(delta);
		},
		getSnapshot() {
			const context = desired.get();
			return sessionSnapshot(
				context.messages,
				pickLLMConfig(context.config),
				usage.get(),
			);
		},
	};
}

function createMirroredContextTracker(
	confirmed: ContextTracker,
	desired: ContextTracker,
): ContextTracker {
	return new (class extends ContextTracker {
		override apply(partial: Parameters<ContextTracker['apply']>[0]): void {
			confirmed.apply(copyContextPatch(partial));
			desired.apply(copyContextPatch(partial));
			this.onChange?.();
		}

		override append(message: Parameters<ContextTracker['append']>[0]): void {
			confirmed.append(message);
			desired.append(message);
			this.onChange?.();
		}

		override reset(): void {
			confirmed.reset();
			desired.reset();
			this.onChange?.();
		}

		override get(): Context {
			return confirmed.get();
		}
	})();
}

function createContext(
	snapshot: SessionSnapshot,
	tools: readonly ToolDefinition[],
): Context {
	return {
		systemPrompt: '',
		messages: [...snapshot.messages],
		tools: [...tools],
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
