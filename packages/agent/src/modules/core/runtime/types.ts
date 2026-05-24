import type { LLMConfig, StreamEvent, UserMessage } from '@franklin/mini-acp';
import type { BaseRuntime } from '@franklin/extensibility';
import type { CoreInspectDump } from '../inspect-dump.js';
import type { SessionSnapshot } from '../state.js';

export type ToolRegistry = {
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

export type CoreRuntime = BaseRuntime & {
	// Mini-ACP turn controls exposed to app/runtime consumers.
	prompt(message: UserMessage): AsyncIterable<StreamEvent>;
	cancel(): Promise<void>;

	// Runtime-owned LLM configuration patching. Auth layers may wrap this.
	setLLMConfig(config: Partial<LLMConfig>): Promise<void>;

	// Runtime event stream used by persistence and UI hooks.
	readonly coreEvents: {
		subscribe(listener: (event: CoreEvent) => void): () => void;
	};

	// User-facing tool enable/disable controls.
	readonly toolRegistry: ToolRegistry;

	// Durable session projection for persistence/fork/child state.
	getSession(): SessionSnapshot;

	// Debug projection for inspect UI. Implementations must redact secrets.
	inspect(): Promise<CoreInspectDump>;
};
