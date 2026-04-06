import type { LLMConfig } from '@franklin/mini-acp';
import type { CoreRuntime } from '@franklin/extensions';

/** Read the current LLM config (without apiKey) from a runtime. */
export async function getLLMConfig(
	runtime: CoreRuntime,
): Promise<Omit<LLMConfig, 'apiKey'>> {
	const state = await runtime.state();
	return state.core.llmConfig;
}

/** Update the LLM config on a running agent (merges with current config). */
export async function setLLMConfig(
	runtime: CoreRuntime,
	update: Partial<Omit<LLMConfig, 'apiKey'>>,
): Promise<void> {
	const current = await getLLMConfig(runtime);
	await runtime.setContext({
		config: { ...current, ...update },
	});
}
