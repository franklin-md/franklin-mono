import {
	getModels,
	getProviders,
	type KnownProvider,
	type Model,
} from '@mariozechner/pi-ai';

import type { Ctx } from '../../../types/context.js';
import { StopCode } from '../../../types/stop-code.js';
import type { TurnEnd } from '../../../types/stream.js';
import { withOpenRouterHeaders } from './headers.js';

export type ResolveSuccess = { ok: true; model: Model<string> };
export type ResolveFailure = { ok: false; turnEnd: TurnEnd };
export type ResolveResult = ResolveSuccess | ResolveFailure;

function fail(stopCode: StopCode, stopMessage: string): ResolveFailure {
	return { ok: false, turnEnd: { type: 'turnEnd', stopCode, stopMessage } };
}

function isKnownProvider(provider: string): provider is KnownProvider {
	return getProviders().includes(provider as KnownProvider);
}

export function resolveModel(config: Ctx['config']): ResolveResult {
	const provider = config?.provider;
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

	const availableModels = getModels(provider);
	const model = availableModels.find((candidate) => candidate.id === modelId);
	if (!model) {
		return fail(
			StopCode.ModelNotFound,
			`Unknown model '${modelId}' for provider '${provider}' in ctx.config`,
		);
	}

	return {
		ok: true,
		model: withOpenRouterHeaders(config, model as Model<string>),
	};
}
