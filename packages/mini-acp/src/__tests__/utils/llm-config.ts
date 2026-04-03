import type { Fixture, Action } from '../../spec-tester/types.js';
import type { LLMConfig } from '../../types/context.js';

export const VALID_LLM_CONFIG_PLACEHOLDER: Readonly<LLMConfig> = Object.freeze({
	provider: '__VALID_LLM_CONFIG_PLACEHOLDER__',
	model: '__VALID_LLM_CONFIG_PLACEHOLDER__',
	apiKey: '__VALID_LLM_CONFIG_PLACEHOLDER__',
});

export function createValidLLMConfig(
	apiKey: string,
	overrides?: Partial<LLMConfig>,
): LLMConfig {
	return {
		provider: 'openrouter',
		model: 'openrouter/free',
		apiKey,
		...overrides,
	};
}

function replaceActionConfig(action: Action, config: LLMConfig): Action {
	if (
		action.type !== 'setContext' ||
		action.ctx.config !== VALID_LLM_CONFIG_PLACEHOLDER
	) {
		return action;
	}

	return {
		...action,
		ctx: {
			...action.ctx,
			config,
		},
	};
}

export function withLLMConfig(
	fixtures: readonly Fixture[],
	config: LLMConfig,
): Fixture[] {
	return fixtures.map((fixture) => ({
		...fixture,
		actions: fixture.actions.map((action) =>
			replaceActionConfig(action, config),
		),
	}));
}
