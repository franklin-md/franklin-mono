import type { LLMConfig } from '@franklin/mini-acp';
import { coreStateHandle, type CoreRuntime } from '../modules/core/index.js';

/** Read the current LLM config (without apiKey) from a runtime. */
export async function getLLMConfig(
	runtime: CoreRuntime,
): Promise<Omit<LLMConfig, 'apiKey'>> {
	const state = await coreStateHandle(runtime).get();
	return state.core.llmConfig;
}
