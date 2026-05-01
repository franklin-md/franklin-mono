import type { Ctx, LLMConfig, MiniACPClient } from '@franklin/mini-acp';
import type {
	BaseRuntime,
	StateHandle,
} from '../../../algebra/runtime/index.js';
import type { CoreState } from '../state.js';

/**
 * Private symbol — core system stashes its `StateHandle<CoreState>` here
 * so the system's `state(runtime)` projection can read it back without
 * a side-channel. Module-private (not re-exported from the package).
 */
export const CORE_STATE: unique symbol = Symbol('core/state');

export type CoreRuntime = BaseRuntime &
	Pick<MiniACPClient, 'prompt' | 'cancel'> & {
		setLLMConfig(config: Partial<LLMConfig>): Promise<void>;
		/**
		 * Full last-sent context snapshot (systemPrompt, messages, tools,
		 * config). Distinct from the state projection, which is the
		 * persistable shape and deliberately omits the compiled system
		 * prompt and tools — those are recomputed by handlers on fork.
		 * `context()` is the debug/inspection view of what the agent
		 * actually saw last.
		 */
		context(): Ctx;
		readonly [CORE_STATE]: StateHandle<CoreState>;
	};

export type AgentClient = MiniACPClient & { dispose(): Promise<void> };
