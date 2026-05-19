import type {
	Context,
	LLMConfig,
	MiniACPClient,
	MiniACPClientHandle,
} from '@franklin/mini-acp';
import type { BaseRuntime, StateHandle } from '@franklin/extensibility';
import type { SessionSnapshot } from '../state.js';

/**
 * Private symbol — core module stashes its `StateHandle<SessionSnapshot>` here
 * so the module's `state(runtime)` projection can read it back without a
 * side-channel.
 */
export const CORE_STATE: unique symbol = Symbol.for(
	'@franklin/agent/core-state',
) as never;

export type CoreEvent =
	| {
			readonly type: 'llm-config-changed';
	  }
	| {
			readonly type: 'turn-settled';
	  };

export type CoreRuntime = BaseRuntime &
	Pick<MiniACPClient, 'prompt' | 'cancel'> & {
		setLLMConfig(config: Partial<LLMConfig>): Promise<void>;
		readonly coreEvents: {
			subscribe(listener: (event: CoreEvent) => void): () => void;
		};
		/**
		 * Full last-sent context snapshot (systemPrompt, messages, tools,
		 * config). Distinct from the state projection, which is the
		 * persistable shape and deliberately omits the compiled system
		 * prompt and tools — those are recomputed by handlers on fork.
		 * `context()` is the debug/inspection view of what the agent
		 * actually saw last.
		 */
		context(): Context;
		readonly [CORE_STATE]: StateHandle<SessionSnapshot>;
	};

export type AgentClient = MiniACPClientHandle;
