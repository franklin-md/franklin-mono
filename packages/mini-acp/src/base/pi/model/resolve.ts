import {
	getModels,
	getProviders,
	type KnownProvider,
	type Model,
} from '@mariozechner/pi-ai';

import type { LLMConfig } from '../../../types/context.js';
import { StopCode } from '../../../types/stop-code.js';
import type { TurnEnd } from '../../../types/stream.js';
import { withOpenRouterHeaders } from './headers.js';
import { getOpenRouterModelOverride } from './openrouter-overrides.js';

export type ResolveSuccess = { ok: true; model: Model<string> };
export type ResolveFailure = { ok: false; turnEnd: TurnEnd };
export type ResolveResult = ResolveSuccess | ResolveFailure;

function fail(stopCode: StopCode, stopMessage: string): ResolveFailure {
	return { ok: false, turnEnd: { type: 'turnEnd', stopCode, stopMessage } };
}

function isKnownProvider(provider: string): provider is KnownProvider {
	return getProviders().includes(provider as KnownProvider);
}

function findModel(
	provider: KnownProvider,
	modelId: string,
): Model<string> | undefined {
	if (provider === 'openrouter') {
		const override = getOpenRouterModelOverride(modelId);
		if (override) {
			return override;
		}
	}

	return getModels(provider).find((candidate) => candidate.id === modelId);
}

export function resolveModel(config: LLMConfig): ResolveResult {
	const provider = config.provider;
	if (!provider) {
		return fail(
			StopCode.ProviderNotSpecified,
			'Missing provider in ctx.config',
		);
	}
	if (!isKnownProvider(provider)) {
		return fail(
			StopCode.ProviderNotFound,
			`Unknown provider in ctx.config: ${provider}`,
		);
	}

	const modelId = config.model;
	if (!modelId) {
		return fail(StopCode.ModelNotSpecified, 'Missing model in ctx.config');
	}

	const model = findModel(provider, modelId);
	if (!model) {
		return fail(
			StopCode.ModelNotFound,
			`Unknown model '${modelId}' for provider '${provider}' in ctx.config`,
		);
	}

	return {
		ok: true,
		model: withOpenRouterHeaders(config, model),
	};
}
