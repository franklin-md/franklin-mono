import type {
	Context,
	ContextPatch,
	Message,
	MiniACPClient,
	Usage,
} from '@franklin/mini-acp';
import type { ContextTracker, UsageTracker } from '@franklin/mini-acp/session';
import type { SessionSnapshot } from '../state.js';

export interface SystemPromptBuild {
	readonly systemPrompt: string;
	readonly changed: boolean;
}

export interface SystemPromptBuilder {
	build(): Promise<SystemPromptBuild>;
}

export interface PromptContextSync {
	sync(client: Pick<MiniACPClient, 'setContext'>): Promise<void>;
}

/**
 * Internal core prompt-context ledger.
 *
 * AgentState separates the context Mini-ACP has actually acknowledged from the
 * context core wants to send next. A hydrated `SessionSnapshot` seeds the next
 * desired context; it is not treated as already sent, because a freshly restored
 * Mini-ACP agent starts with an empty `Context` until `setContext` succeeds.
 *
 * Today the dehydrated snapshot is close to the model-visible history Mini-ACP
 * has seen. Over time it may become a richer application history, including
 * compaction points or other checkpoints that are projected down into the next
 * Mini-ACP `Context` before a prompt.
 */
export interface AgentState {
	getAgentContext(): Context;
	getSnapshot(): SessionSnapshot;
	readonly contextTracker: ContextTracker;
	readonly promptContext: PromptContextSync;
	readonly systemPrompt: SystemPromptBuilder;
	readonly usageTracker: UsageTracker;
	apply(partial: ContextPatch): void;
	append(message: Message): void;
	add(delta: Usage): void;
}
