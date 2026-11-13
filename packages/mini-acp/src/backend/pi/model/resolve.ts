import {
	getBuiltinModels,
	getBuiltinProviders,
} from '@earendil-works/pi-ai/providers/all';
import type { KnownProvider, Model } from '@earendil-works/pi-ai';

import type { LLMConfig } from '../../../types/context.js';
import { StopCode } from '../../../types/stop-code.js';
import type { TurnEnd } from '../../../types/stream.js';
import { withOpenRouterHeaders } from './headers.js';
import { getModelOverride } from './overrides.js';

export type ResolveSuccess = { ok: true; model: Model<string> };
export type ResolveFailure = { ok: false; turnEnd: TurnEnd };
export type ResolveResult = ResolveSuccess | ResolveFailure;

function fail(stopCode: StopCode, stopMessage: string): ResolveFailure {
	return { ok: false, turnEnd: { type: 'turnEnd', stopCode, stopMessage } };
}

function isKnownProvider(provider: string): provider is KnownProvider {
	return getBuiltinProviders().includes(provider as KnownProvider);
}

function findModel(
	provider: KnownProvider,
	modelId: string,
): Model<string> | undefined {
	const override = getModelOverride(provider, modelId);
	if (override) {
		return override;
	}
	// Local definitions are also the reviewed Codex set; reject other upstream IDs.
	if (provider === 'openai-codex') return undefined;

	return getBuiltinModels(provider).find(
		(candidate) => candidate.id === modelId,
	);
}

export function resolveModel(config: LLMConfig): ResolveResult {
	const provider = config.provider;
	if (!provider) {
		return fail(
			StopCode.ProviderNotSpecified,
			'Missing provider in context.config',
		);
	}
	if (!isKnownProvider(provider)) {
		return fail(
			StopCode.ProviderNotFound,
			`Unknown provider in context.config: ${provider}`,
		);
	}

	const modelId = config.model;
	if (!modelId) {
		return fail(StopCode.ModelNotSpecified, 'Missing model in context.config');
	}

	const model = findModel(provider, modelId);
	if (!model) {
		return fail(
			StopCode.ModelNotFound,
			`Unknown model '${modelId}' for provider '${provider}' in context.config`,
		);
	}

	return {
		ok: true,
		model: withOpenRouterHeaders(config, model),
	};
}
