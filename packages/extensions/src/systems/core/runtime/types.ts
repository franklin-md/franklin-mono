import type { Ctx, LLMConfig, MiniACPClient } from '@franklin/mini-acp';
import type { BaseRuntime } from '../../../algebra/runtime/index.js';
import type { CoreState } from '../state.js';

export type CoreRuntime = BaseRuntime<CoreState> &
	Pick<MiniACPClient, 'prompt' | 'cancel'> & {
		setLLMConfig(config: Partial<LLMConfig>): Promise<void>;
		/**
		 * Full last-sent context snapshot (systemPrompt, messages, tools,
		 * config). Distinct from `state.get()`, which is the persistable shape
		 * and deliberately omits the compiled system prompt and tools —
		 * those are recomputed by handlers on fork. `context()` is the
		 * debug/inspection view of what the agent actually saw last.
		 */
		context(): Ctx;
	};

export type AgentClient = MiniACPClient & { dispose(): Promise<void> };
