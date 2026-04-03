import {
	getModels,
	getProviders,
	type KnownProvider,
	type Model,
} from '@mariozechner/pi-ai';

import type { Ctx } from '../../types/context.js';

function isKnownProvider(provider: string): provider is KnownProvider {
	return getProviders().includes(provider as KnownProvider);
}

export function resolveModel(config: Ctx['config']): Model<string> {
	const provider = config?.provider;
	if (!provider) {
		throw new Error('Missing provider in ctx.config');
	}
	if (!isKnownProvider(provider)) {
		throw new Error(`Unknown provider in ctx.config: ${provider}`);
	}

	const modelId = config.model;
	if (!modelId) {
		throw new Error('Missing model in ctx.config');
	}

	const availableModels = getModels(provider);
	const model = availableModels.find((candidate) => candidate.id === modelId);
	if (!model) {
		throw new Error(
			`Unknown model '${modelId}' for provider '${provider}' in ctx.config`,
		);
	}

	return model as Model<string>;
}
