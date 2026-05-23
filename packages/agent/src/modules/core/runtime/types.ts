import type {
	LLMConfig,
	MiniACPClient,
	MiniACPClientHandle,
} from '@franklin/mini-acp';
import type { BaseRuntime } from '@franklin/extensibility';
import type { SessionSnapshot } from '../state.js';

export type RuntimeToolRegistry = {
	setEnabled(name: string, enabled: boolean): void;
};

export type CoreEvent =
	| {
			readonly type: 'llm-config-changed';
	  }
	| {
			readonly type: 'turn-settled';
	  }
	| {
			readonly type: 'tool-registry-changed';
	  };

export type CoreRuntime = BaseRuntime &
	Pick<MiniACPClient, 'prompt' | 'cancel'> & {
		setLLMConfig(config: Partial<LLMConfig>): Promise<void>;
		readonly coreEvents: {
			subscribe(listener: (event: CoreEvent) => void): () => void;
		};
		readonly toolRegistry: RuntimeToolRegistry;
		getSession(): SessionSnapshot;
	};

export type AgentClient = MiniACPClientHandle;
