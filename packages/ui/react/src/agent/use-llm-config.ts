import { useCallback } from 'react';

import { getLLMConfig } from '@franklin/agent/browser';
import type { LLMConfig } from '@franklin/mini-acp';

import { useObservedState } from '../utils/use-observed-state.js';
import { useAgent } from './agent-context.js';

export type RedactedLLMConfig = Omit<LLMConfig, 'apiKey'>;

export type UseLLMConfig = {
	readonly config: RedactedLLMConfig;
	readonly patchConfig: (patch: RedactedLLMConfig) => Promise<void>;
};

export function useLLMConfig(): UseLLMConfig {
	const runtime = useAgent();

	const subscribe = useCallback(
		(listener: () => void) => {
			return runtime.coreEvents.subscribe((event) => {
				if (event.type === 'llm-config-changed') listener();
			});
		},
		[runtime],
	);
	const read = useCallback(() => getLLMConfig(runtime), [runtime]);
	const apply = useCallback(
		(value: RedactedLLMConfig) => runtime.setLLMConfig(value),
		[runtime],
	);

	const { value, set } = useObservedState(subscribe, read, apply, {});
	return { config: value, patchConfig: set };
}
