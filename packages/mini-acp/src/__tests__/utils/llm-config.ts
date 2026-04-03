import type { FixtureExpectation, Action } from '../../spec-tester/types.js';
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

function isPlaceholderValue(value: unknown): boolean {
	return value === VALID_LLM_CONFIG_PLACEHOLDER.provider;
}

function hasPlaceholder(cfg: LLMConfig): boolean {
	return (
		isPlaceholderValue(cfg.provider) ||
		isPlaceholderValue(cfg.model) ||
		isPlaceholderValue(cfg.apiKey)
	);
}

function replaceActionConfig(action: Action, config: LLMConfig): Action {
	if (action.type !== 'setContext' || !action.ctx.config) {
		return action;
	}

	if (!hasPlaceholder(action.ctx.config)) {
		return action;
	}

	// Merge: start with real config, then overlay any non-placeholder fields
	// from the fixture's config. Placeholder values get replaced; explicit
	// overrides (e.g. provider: undefined) are preserved.
	const merged: LLMConfig = { ...config };
	for (const key of Object.keys(action.ctx.config) as (keyof LLMConfig)[]) {
		const fixtureValue = action.ctx.config[key];
		if (!isPlaceholderValue(fixtureValue)) {
			merged[key] = fixtureValue as never;
		}
	}

	return {
		...action,
		ctx: {
			...action.ctx,
			config: merged,
		},
	};
}

export function withLLMConfig(
	entries: readonly FixtureExpectation[],
	config: LLMConfig,
): FixtureExpectation[] {
	return entries.map((entry) => ({
		...entry,
		fixture: {
			...entry.fixture,
			actions: entry.fixture.actions.map((action) =>
				replaceActionConfig(action, config),
			),
		},
	}));
}
