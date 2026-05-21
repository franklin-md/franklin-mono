import type {
	LLMConfig,
	MiniACPClient,
	MiniACPClientHandle,
} from '@franklin/mini-acp';
import type { BaseRuntime } from '@franklin/extensibility';
import type { SessionSnapshot } from '../state.js';

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
		getSession(): SessionSnapshot;
	};

export type AgentClient = MiniACPClientHandle;
