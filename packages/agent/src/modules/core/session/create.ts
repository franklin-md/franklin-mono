import type { Context, LLMConfig, Message, Usage } from '@franklin/mini-acp';
import { ContextTracker, UsageTracker } from '@franklin/mini-acp/session';
import type { SessionSnapshot } from '../state.js';
import type { MutableSession } from './types.js';

type LLMConfigSnapshot = SessionSnapshot['llmConfig'];

export function createSession(snapshot: SessionSnapshot): MutableSession {
	const context = new ContextTracker();
	context.apply(createContext(snapshot));
	const usage = new UsageTracker();
	usage.add(snapshot.usage);

	return {
		contextTracker: context,
		usageTracker: usage,
		context: () => context.get(),
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
