import type { Model } from '@mariozechner/pi-ai';

import type { LLMConfig } from '../../../types/context.js';

export const OPENROUTER_APP_URL = 'https://franklin.md';
export const OPENROUTER_APP_TITLE = 'Franklin';
//openrouter.ai/docs/app-attribution#x-openrouter-categories
// Allows 2
export const OPENROUTER_APP_CATEGORY = ['personal-agent', 'general-chat'];

export function withOpenRouterHeaders(
	config: LLMConfig,
	model: Model<string>,
): Model<string> {
	if (config.provider !== 'openrouter') {
		return model;
	}

	// https://openrouter.ai/docs/app-attribution
	// https://openrouter.ai/docs/api/reference/overview#headers
	const headers = { ...model.headers };
	headers['HTTP-Referer'] = OPENROUTER_APP_URL;
	headers['X-OpenRouter-Title'] = OPENROUTER_APP_TITLE;
	headers['X-OpenRouter-Categories'] = OPENROUTER_APP_CATEGORY.join(',');
	return {
		...model,
		headers,
	};
}
